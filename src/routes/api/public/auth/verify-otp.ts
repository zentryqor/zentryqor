import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createHash, timingSafeEqual } from "node:crypto";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  code: z.string().regex(/^\d{6}$/),
  password: z.string().min(6).max(72),
  name: z.string().trim().min(1).max(60),
});

const MAX_ATTEMPTS = 5;

export const Route = createFileRoute("/api/public/auth/verify-otp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonError(400, "Invalid request body");
        }
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          return jsonError(400, "Please enter the 6-digit code.");
        }
        const { email, code, password, name } = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { enforceRateLimit, clientIpFromRequest, RateLimitError } =
          await import("@/lib/security.server");

        const ip = clientIpFromRequest(request);
        try {
          await enforceRateLimit(`otp-verify:ip:${ip}`, 30, 60, "Too many verification attempts");
          await enforceRateLimit(`otp-verify:email:${email}`, 10, 60, "Too many verification attempts");
        } catch (e) {
          if (e instanceof RateLimitError) return jsonError(429, e.message, { resetAt: e.resetAt });
          throw e;
        }

        const { data: pending, error: fetchErr } = await supabaseAdmin
          .from("pending_signups")
          .select("email, code_hash, display_name, expires_at, attempts")
          .eq("email", email)
          .maybeSingle();

        if (fetchErr) {
          console.error("pending_signups fetch failed", fetchErr);
          return jsonError(500, "Could not verify code. Try again.");
        }
        if (!pending) {
          return jsonError(400, "No pending verification. Request a new code.");
        }
        if (new Date(pending.expires_at).getTime() < Date.now()) {
          await supabaseAdmin.from("pending_signups").delete().eq("email", email);
          return jsonError(400, "Code expired. Request a new one.");
        }
        if (pending.attempts >= MAX_ATTEMPTS) {
          await supabaseAdmin.from("pending_signups").delete().eq("email", email);
          return jsonError(429, "Too many wrong attempts. Request a new code.");
        }

        const candidate = createHash("sha256").update(code).digest();
        const expected = Buffer.from(pending.code_hash, "hex");
        const match = candidate.length === expected.length && timingSafeEqual(candidate, expected);

        if (!match) {
          await supabaseAdmin
            .from("pending_signups")
            .update({ attempts: pending.attempts + 1 })
            .eq("email", email);
          const remaining = Math.max(0, MAX_ATTEMPTS - (pending.attempts + 1));
          return jsonError(400, `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
        }

        // Create the auth user (email pre-confirmed).
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: name },
        });
        if (createErr || !created?.user) {
          const msg = createErr?.message ?? "";
          if (msg.toLowerCase().includes("already")) {
            await supabaseAdmin.from("pending_signups").delete().eq("email", email);
            return jsonError(409, "An account with this email already exists. Please log in.");
          }
          console.error("createUser failed", createErr);
          return jsonError(500, "Could not create your account. Try again.");
        }

        // Clean up
        await supabaseAdmin.from("pending_signups").delete().eq("email", email);

        // Issue a session by signing in with password.
        const { data: signIn, error: signInErr } =
          await supabaseAdmin.auth.signInWithPassword({ email, password });
        if (signInErr || !signIn?.session) {
          console.error("post-verify signIn failed", signInErr);
          return jsonError(500, "Account created but sign-in failed. Please log in.");
        }

        return Response.json({
          access_token: signIn.session.access_token,
          refresh_token: signIn.session.refresh_token,
          expires_at: signIn.session.expires_at,
          token_type: signIn.session.token_type,
          user: { id: signIn.user?.id, email: signIn.user?.email },
        });
      },
    },
  },
});

function jsonError(status: number, message: string, details?: Record<string, unknown>) {
  return new Response(JSON.stringify({ error: message, ...details }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
