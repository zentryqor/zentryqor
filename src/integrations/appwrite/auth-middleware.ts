// Server-function middleware that authenticates the caller with their Appwrite
// session JWT and exposes a database client scoped to that user. Drop-in
// replacement for the previous Supabase-session middleware: the handler context
// keeps the same `supabase` / `userId` / `claims` shape.
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const requireAppwriteAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env["SUPABASE_URL"];
    const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Backend is not configured.");
    }

    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: No authorization header provided");
    }
    const jwt = authHeader.slice("Bearer ".length).trim();
    if (!jwt) throw new Error("Unauthorized: No token provided");

    const { verifyAppwriteJwt, bridgeSession } = await import(
      "@/lib/appwrite-bridge.server"
    );
    const identity = await verifyAppwriteJwt(jwt);
    const session = await bridgeSession(identity);

    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${session.accessToken}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    return next({
      context: {
        supabase,
        userId: session.userId,
        claims: {
          sub: session.userId,
          email: identity.email,
          appwrite_user_id: identity.appwriteUserId,
        } as Record<string, unknown>,
      },
    });
  },
);
