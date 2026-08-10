// Server-only: 6-digit email verification codes delivered via Resend.
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export type OtpPurpose = "signup" | "signin";

function hashCode(email: string, purpose: string, code: string) {
  const pepper = process.env["OAUTH_STATE_SECRET"] ?? "zentry-otp";
  return createHash("sha256")
    .update(`${email.toLowerCase()}|${purpose}|${code}|${pepper}`)
    .digest("hex");
}

export async function sendEmailOtp(
  email: string,
  purpose: OtpPurpose,
): Promise<void> {
  const lower = email.toLowerCase();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

  // Invalidate any outstanding codes for this email/purpose.
  await supabaseAdmin
    .from("email_otps")
    .update({ consumed_at: new Date().toISOString() })
    .eq("email_lower", lower)
    .eq("purpose", purpose)
    .is("consumed_at", null);

  const { error } = await supabaseAdmin.from("email_otps").insert({
    email_lower: lower,
    purpose,
    code_hash: hashCode(lower, purpose, code),
    expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString(),
  });
  if (error) {
    console.error("[otp] insert failed", error);
    throw new Error(
      `Could not create a verification code (${error.message || error.code || "unknown error"}).`,
    );
  }


  await deliverCode(lower, code, purpose);
}

async function deliverCode(email: string, code: string, purpose: OtpPurpose) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const resendKey = process.env["RESEND_API_KEY"];
  if (!lovableKey || !resendKey) {
    throw new Error("Email delivery is not configured.");
  }

  const heading =
    purpose === "signup" ? "Confirm your email" : "Confirm your log in";

  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#000;padding:32px">
    <div style="max-width:440px;margin:0 auto;background:#0a0a0c;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:32px;color:#fff">
      <div style="font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#60a5fa">Zentry Qor</div>
      <h1 style="font-size:22px;margin:14px 0 6px;font-weight:600">${heading}</h1>
      <p style="color:#a1a1aa;font-size:14px;margin:0 0 22px">Enter this 6-digit verification code to continue. It expires in ${CODE_TTL_MINUTES} minutes.</p>
      <div style="font-size:34px;font-weight:700;letter-spacing:.32em;text-align:center;padding:18px;border-radius:14px;background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.35)">${code}</div>
      <p style="color:#71717a;font-size:12px;margin:22px 0 0">If you didn't request this, you can safely ignore this email.</p>
    </div>
  </div>`;

  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({
      from: "Zentry Qor <onboarding@resend.dev>",
      to: [email],
      subject: `${code} is your Zentry Qor verification code`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[otp] resend send failed [${res.status}]: ${body}`);
    throw new Error("We couldn't send the verification email. Please try again.");
  }
}

/** Returns null when valid, otherwise a user-facing error message. */
export async function verifyEmailOtp(
  email: string,
  purpose: OtpPurpose,
  code: string,
): Promise<string | null> {
  const lower = email.toLowerCase();
  const { data: row } = await supabaseAdmin
    .from("email_otps")
    .select("id, code_hash, attempts, expires_at")
    .eq("email_lower", lower)
    .eq("purpose", purpose)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return "That code is no longer valid. Request a new one.";
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return "That code expired. Request a new one.";
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return "Too many incorrect codes. Request a new one.";
  }

  const expected = Buffer.from(row.code_hash);
  const given = Buffer.from(hashCode(lower, purpose, code));
  const ok = expected.length === given.length && timingSafeEqual(expected, given);

  if (!ok) {
    await supabaseAdmin
      .from("email_otps")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id);
    const left = MAX_ATTEMPTS - (row.attempts + 1);
    return left > 0
      ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.`
      : "Too many incorrect codes. Request a new one.";
  }

  await supabaseAdmin
    .from("email_otps")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id);
  return null;
}
