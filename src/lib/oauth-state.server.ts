import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function secret(): string {
  const s = process.env.OAUTH_STATE_SECRET;
  if (!s) throw new Error("OAUTH_STATE_SECRET not configured");
  return s;
}

function b64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signOAuthState(payload: {
  userId: string;
  platform: "youtube";
  codeVerifier?: string;
}): string {
  const body = {
    u: payload.userId,
    p: payload.platform,
    v: payload.codeVerifier ?? null,
    n: b64url(randomBytes(12)),
    e: Date.now() + STATE_TTL_MS,
  };
  const bodyB64 = b64url(JSON.stringify(body));
  const sig = b64url(createHmac("sha256", secret()).update(bodyB64).digest());
  return `${bodyB64}.${sig}`;
}

export function verifyOAuthState(state: string): {
  userId: string;
  platform: "youtube";
  codeVerifier: string | null;
} {
  const [bodyB64, sig] = state.split(".");
  if (!bodyB64 || !sig) throw new Error("Malformed state");
  const expected = createHmac("sha256", secret()).update(bodyB64).digest();
  const provided = fromB64url(sig);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    throw new Error("Invalid state signature");
  }
  const body = JSON.parse(fromB64url(bodyB64).toString("utf8"));
  if (typeof body.e !== "number" || body.e < Date.now()) {
    throw new Error("Expired state");
  }
  return { userId: body.u, platform: body.p, codeVerifier: body.v ?? null };
}

// PKCE helpers (TikTok uses PKCE)
export function makePkcePair() {
  const verifier = b64url(randomBytes(48));
  const challenge = b64url(
    require("crypto").createHash("sha256").update(verifier).digest(),
  );
  return { verifier, challenge };
}
