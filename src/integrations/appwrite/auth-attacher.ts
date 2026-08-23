// Client middleware that attaches a short-lived Appwrite JWT to every server
// function call. Registered globally in src/start.ts.
import { createMiddleware } from "@tanstack/react-start";
import { appwriteJwt } from "@/lib/appwrite";

let cached: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (cached && cached.expiresAt > Date.now()) return cached.token;
  const token = await appwriteJwt();
  if (!token) {
    cached = null;
    return null;
  }
  // Appwrite JWTs live 15 minutes; refresh a little early.
  cached = { token, expiresAt: Date.now() + 12 * 60 * 1000 };
  return token;
}

export const attachAppwriteAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = await getToken();
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  },
);

/** Clear the cached JWT (call on sign-out). */
export function clearAppwriteAuthCache() {
  cached = null;
}
