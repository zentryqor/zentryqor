import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const signUpSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(6).max(128),
  name: z.string().trim().max(80).optional(),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/)
    .optional(),
});

function jsonError(
  status: number,
  message: string,
  details?: Record<string, unknown>,
) {
  return new Response(JSON.stringify({ error: message, ...details }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/auth/signup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonError(400, "Invalid request body");
        }
        const parsed = signUpSchema.safeParse(body);
        if (!parsed.success) {
          return jsonError(
            400,
            "Please enter a valid email and a password of at least 6 characters.",
          );
        }
        const { email, password, name, code } = parsed.data;

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { enforceRateLimit, clientIpFromRequest, RateLimitError } =
          await import("@/lib/security.server");
        const { sendEmailOtp, verifyEmailOtp } = await import(
          "@/lib/email-otp.server"
        );

        try {
          await enforceRateLimit(
            `signup:ip:${clientIpFromRequest(request)}`,
            15,
            600,
            "Too many sign-up attempts from this network",
          );
          await enforceRateLimit(
            `signup:email:${email}`,
            8,
            600,
            "Too many sign-up attempts for this email",
          );
        } catch (e) {
          if (e instanceof RateLimitError) {
            return jsonError(429, e.message, { resetAt: e.resetAt });
          }
          throw e;
        }

        // Step 1 — no code yet: send the verification code.
        if (!code) {
          try {
            await sendEmailOtp(email, "signup");
          } catch (e) {
            return jsonError(
              502,
              e instanceof Error ? e.message : "Could not send the code.",
            );
          }
          return Response.json({ verification_required: true, email, expires_in: 600 });
        }

        // Step 2 — verify the code, then create the account.
        const otpError = await verifyEmailOtp(email, "signup", code);
        if (otpError) return jsonError(401, otpError);

        const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: name || email.split("@")[0] },
        });

        if (createErr) {
          const msg = /already|registered|exists/i.test(createErr.message)
            ? "An account with this email already exists. Try logging in instead."
            : createErr.message;
          return jsonError(400, msg);
        }

        const { data: signIn, error: signInErr } =
          await supabaseAdmin.auth.signInWithPassword({ email, password });
        if (signInErr || !signIn?.session) {
          return jsonError(
            500,
            "Account created, but we couldn't start your session. Please log in.",
          );
        }

        return Response.json({
          access_token: signIn.session.access_token,
          refresh_token: signIn.session.refresh_token,
          expires_at: signIn.session.expires_at,
          user: { id: signIn.user?.id, email: signIn.user?.email },
        });
      },
    },
  },
});
