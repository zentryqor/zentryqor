// Server-only bridge between the new Appwrite identity and the existing
// database. Verifies an Appwrite user JWT, resolves (or creates) the matching
// database auth user by email, and mints a short-lived database access token so
// existing row-level security keeps applying as that user.
import { appwriteCreds } from "@/lib/appwrite.server";

export type AppwriteIdentity = {
  appwriteUserId: string;
  email: string;
  name: string;
};

type BridgedSession = {
  userId: string;
  accessToken: string;
  expiresAt: number;
};

const sessionCache = new Map<string, BridgedSession>();

/** Verify an Appwrite JWT by calling /account as that user (no API key). */
export async function verifyAppwriteJwt(jwt: string): Promise<AppwriteIdentity> {
  const { endpoint, projectId } = appwriteCreds();
  const res = await fetch(`${endpoint}/account`, {
    headers: {
      "X-Appwrite-Project": projectId,
      "X-Appwrite-JWT": jwt,
    },
  });
  if (!res.ok) throw new Error("Unauthorized: Invalid session token");
  const account = (await res.json()) as {
    $id?: string;
    email?: string;
    name?: string;
  };
  if (!account?.$id || !account.email) {
    throw new Error("Unauthorized: Invalid session token");
  }
  return {
    appwriteUserId: account.$id,
    email: account.email.toLowerCase(),
    name: account.name ?? "",
  };
}

/**
 * Resolve the database user for an Appwrite identity and return a usable
 * access token. Accounts are linked by email; a database user is created on
 * first sign-in so brand-new Appwrite accounts get profiles/credits rows via
 * the existing signup trigger.
 */
export async function bridgeSession(
  identity: AppwriteIdentity,
): Promise<BridgedSession> {
  const cached = sessionCache.get(identity.appwriteUserId);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let link = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: identity.email,
  });

  if (link.error || !link.data?.user) {
    // No database user yet — create one, then retry the link.
    const created = await supabaseAdmin.auth.admin.createUser({
      email: identity.email,
      email_confirm: true,
      user_metadata: {
        display_name: identity.name || identity.email.split("@")[0],
        appwrite_user_id: identity.appwriteUserId,
      },
    });
    if (created.error && !/already/i.test(created.error.message)) {
      throw new Error(`Could not link account: ${created.error.message}`);
    }
    link = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: identity.email,
    });
    if (link.error || !link.data?.user) {
      throw new Error(
        `Could not link account: ${link.error?.message ?? "unknown error"}`,
      );
    }
  }

  const tokenHash = (link.data.properties as { hashed_token?: string } | null)
    ?.hashed_token;
  if (!tokenHash) throw new Error("Could not link account: missing token");

  const { createClient } = await import("@supabase/supabase-js");
  const anon = createClient(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
  const { data: verified, error: verifyError } = await anon.auth.verifyOtp({
    type: "email",
    token_hash: tokenHash,
  });
  if (verifyError || !verified.session) {
    throw new Error(
      `Could not link account: ${verifyError?.message ?? "no session"}`,
    );
  }

  const session: BridgedSession = {
    userId: verified.session.user.id,
    accessToken: verified.session.access_token,
    expiresAt: (verified.session.expires_at ?? 0) * 1000 || Date.now() + 3_000_000,
  };
  sessionCache.set(identity.appwriteUserId, session);
  return session;
}
