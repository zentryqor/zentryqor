// Server-only security helpers: rate limiting + string sanitization.
// Never import from client modules.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: string;
};

/**
 * Consume one token from a fixed-window rate-limit bucket.
 * `key` should encode the action AND the identity (user id, IP, email, etc).
 */
export async function consumeRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const { data, error } = await supabaseAdmin.rpc("consume_rate_limit", {
    _key: key,
    _max: max,
    _window_seconds: windowSeconds,
  });
  if (error) {
    // Fail-open on infra errors — do not lock everyone out if the limiter breaks.
    console.error("consume_rate_limit failed", error);
    return { allowed: true, remaining: max, resetAt: new Date().toISOString() };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: !!row?.allowed,
    remaining: row?.remaining ?? 0,
    resetAt: row?.reset_at ?? new Date().toISOString(),
  };
}

export class RateLimitError extends Error {
  status = 429;
  resetAt: string;
  constructor(message: string, resetAt: string) {
    super(message);
    this.resetAt = resetAt;
    this.name = "RateLimitError";
  }
}

export async function enforceRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
  label = "Too many requests",
): Promise<RateLimitResult> {
  const r = await consumeRateLimit(key, max, windowSeconds);
  if (!r.allowed) {
    const wait = Math.max(
      0,
      Math.ceil((new Date(r.resetAt).getTime() - Date.now()) / 1000),
    );
    throw new RateLimitError(
      `${label}. Try again in ${wait} second${wait === 1 ? "" : "s"}.`,
      r.resetAt,
    );
  }
  return r;
}

/**
 * Strip ASCII/Unicode control characters (except common whitespace) and
 * collapse runs of whitespace. Use on any user-supplied string that will be
 * rendered back to other users.
 */
export function sanitizeUserText(input: string, maxLength = 500): string {
  if (typeof input !== "string") return "";
  // Remove C0 controls, DEL, and C1 controls — keep \n \r \t.
  const cleaned = input
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, "") // zero-width / bidi
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, maxLength);
}

export function clientIpFromRequest(request: Request): string {
  const h = request.headers;
  const candidates = [
    h.get("cf-connecting-ip"),
    h.get("x-real-ip"),
    h.get("x-forwarded-for")?.split(",")[0]?.trim(),
  ];
  for (const c of candidates) if (c) return c;
  return "unknown";
}
