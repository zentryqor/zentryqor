import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(128),
});

const LOCKOUT_LIMIT = 5;
const LOCKOUT_MINUTES = 15;

export const Route = createFileRoute("/api/public/auth/signin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonError(400, "Invalid request body");
        }
        const parsed = signInSchema.safeParse(body);
        if (!parsed.success) {
          return jsonError(400, "Please enter a valid email and password.");
        }
        const { email, password } = parsed.data;

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { enforceRateLimit, clientIpFromRequest, RateLimitError } =
          await import("@/lib/security.server");

        const ip = clientIpFromRequest(request);

        // IP-based throttle (catches credential stuffing)
        try {
          await enforceRateLimit(
            `signin:ip:${ip}`,
            20,
            60,
            "Too many sign-in attempts from this network",
          );
          await enforceRateLimit(
            `signin:email:${email}`,
            10,
            60,
            "Too many sign-in attempts for this account",
          );
        } catch (e) {
          if (e instanceof RateLimitError) {
            return jsonError(429, e.message, { resetAt: e.resetAt });
          }
          throw e;
        }

        // Account lockout check
        const { data: lockoutRows, error: lockoutErr } = await supabaseAdmin.rpc(
          "check_signin_lockout",
          { _email: email },
        );
        if (lockoutErr) {
          console.error("check_signin_lockout failed", lockoutErr);
        }
        const lockout = Array.isArray(lockoutRows) ? lockoutRows[0] : lockoutRows;
        if (lockout?.locked) {
          const unlockAt = new Date(lockout.unlock_at);
          const mins = Math.max(
            1,
            Math.ceil((unlockAt.getTime() - Date.now()) / 60000),
          );
          return jsonError(
            423,
            `Account temporarily locked due to too many failed sign-in attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
            { unlockAt: lockout.unlock_at, locked: true },
          );
        }

        // Attempt sign-in via admin client (service role can issue sessions).
        const { data: signIn, error: signInErr } =
          await supabaseAdmin.auth.signInWithPassword({ email, password });

        if (signInErr || !signIn?.session) {
          await supabaseAdmin.rpc("record_signin_failure", { _email: email });
          // Re-check after recording to surface remaining attempts.
          const { data: after } = await supabaseAdmin.rpc(
            "check_signin_lockout",
            { _email: email },
          );
          const afterRow = Array.isArray(after) ? after[0] : after;
          const attempts = afterRow?.attempts ?? 0;
          const remaining = Math.max(0, LOCKOUT_LIMIT - attempts);
          const message =
            remaining > 0
              ? `Incorrect email or password. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before lockout.`
              : `Account locked for ${LOCKOUT_MINUTES} minutes due to too many failed attempts.`;
          return jsonError(401, message, {
            attempts,
            remaining,
            locked: remaining === 0,
          });
        }

        // Success — clear failures
        await supabaseAdmin.rpc("clear_signin_failures", { _email: email });

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
