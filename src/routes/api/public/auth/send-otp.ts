import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createHash, randomInt } from "node:crypto";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(6).max(72),
  name: z.string().trim().min(1).max(60),
});

const OTP_TTL_MINUTES = 10;

export const Route = createFileRoute("/api/public/auth/send-otp")({
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
          return jsonError(400, "Please provide a valid name, email, and password.");
        }
        const { email, password, name } = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { enforceRateLimit, clientIpFromRequest, RateLimitError } =
          await import("@/lib/security.server");

        const ip = clientIpFromRequest(request);
        try {
          await enforceRateLimit(`otp:ip:${ip}`, 10, 60, "Too many requests from this network");
          await enforceRateLimit(`otp:email:${email}`, 5, 60, "Too many codes requested for this email");
        } catch (e) {
          if (e instanceof RateLimitError) return jsonError(429, e.message, { resetAt: e.resetAt });
          throw e;
        }

        // Existence check is deferred to verify step (createUser will surface "already registered").

        // Generate 6-digit code
        const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
        const codeHash = createHash("sha256").update(code).digest("hex");
        const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();

        const { error: upsertErr } = await supabaseAdmin
          .from("pending_signups")
          .upsert(
            {
              email,
              code_hash: codeHash,
              display_name: name,
              expires_at: expiresAt,
              attempts: 0,
            },
            { onConflict: "email" },
          );
        if (upsertErr) {
          console.error("pending_signups upsert failed", upsertErr);
          return jsonError(500, "Could not create verification. Try again.");
        }
        // Password is not stored server-side; the client re-sends it on verify.
        void password;

        const sent = await sendOtpEmail(email, code, name);
        if (!sent.ok) {
          console.error("Resend send failed", sent.status, sent.body);
          const providerMsg = extractResendMessage(sent.body);
          return jsonError(
            400,
            providerMsg ||
              "Could not send verification email. Verify a sending domain at resend.com/domains and set RESEND_FROM.",
          );
        }

        return Response.json({ ok: true, expiresAt });
      },
    },
  },
});

async function sendOtpEmail(to: string, code: string, name: string) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    return { ok: false, status: 0, body: "Missing API keys" };
  }
  const from = process.env.RESEND_FROM || "Zentry Qor <onboarding@resend.dev>";
  const subject = `${code} is your Zentry Qor verification code`;
  const html = renderOtpEmail(code, name);
  const text = `Hi ${name},\n\nYour Zentry Qor verification code is: ${code}\n\nThis code expires in ${OTP_TTL_MINUTES} minutes.\n\nIf you did not request this, you can ignore this email.`;

  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

function renderOtpEmail(code: string, name: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0b0d12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e6e9ef;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0d12;padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" style="max-width:480px;background:#12151c;border:1px solid rgba(255,255,255,0.06);border-radius:20px;padding:32px;">
          <tr><td style="text-align:center;padding-bottom:8px;">
            <div style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#8b93a5;">Zentry Qor</div>
            <h1 style="font-size:22px;margin:12px 0 0;color:#ffffff;font-weight:700;">Verify your email</h1>
          </td></tr>
          <tr><td style="padding-top:18px;font-size:14px;line-height:1.6;color:#b3b9c8;">
            Hi ${escapeHtml(name)}, use the code below to finish creating your account. It expires in ${OTP_TTL_MINUTES} minutes.
          </td></tr>
          <tr><td align="center" style="padding:28px 0;">
            <div style="display:inline-block;font-family:'SFMono-Regular',Menlo,monospace;font-size:34px;letter-spacing:14px;color:#ffffff;background:#1c2029;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:18px 24px;">${code}</div>
          </td></tr>
          <tr><td style="font-size:12px;color:#6b7280;line-height:1.6;">
            If you didn't request this, you can safely ignore this email.
          </td></tr>
        </table>
        <div style="margin-top:20px;font-size:11px;color:#4b5060;letter-spacing:0.18em;text-transform:uppercase;">Zentry Qor · Creator Workspace</div>
      </td></tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function jsonError(status: number, message: string, details?: Record<string, unknown>) {
  return new Response(JSON.stringify({ error: message, ...details }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
