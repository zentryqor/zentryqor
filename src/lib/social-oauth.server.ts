// Provider config + refresh helpers. Base URL for callbacks is env-driven
// so preview and prod both work.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const PUBLIC_BASE_URL =
  process.env.PUBLIC_APP_URL ?? "https://zentryqor.lovable.app";

export type Platform = "youtube";

export const PROVIDERS = {
  youtube: {
    label: "YouTube",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/yt-analytics.readonly",
    ],
    envClient: "GOOGLE_OAUTH_CLIENT_ID",
    envSecret: "GOOGLE_OAUTH_CLIENT_SECRET",
    callbackPath: "/api/public/oauth/youtube/callback",
    usesPkce: false,
  },
} as const;

export function providerCreds(p: Platform) {
  const cfg = PROVIDERS[p];
  const clientId = process.env[cfg.envClient];
  const clientSecret = process.env[cfg.envSecret];
  if (!clientId || !clientSecret) {
    throw new Error(
      `${cfg.label} OAuth not configured. Set ${cfg.envClient} and ${cfg.envSecret}.`,
    );
  }
  return { clientId, clientSecret, cfg };
}

export function callbackUrl(p: Platform, origin = PUBLIC_BASE_URL) {
  const safeOrigin = origin.replace(/\/$/, "");
  return `${safeOrigin}${PROVIDERS[p].callbackPath}`;
}

export type StoredAccount = {
  id: string;
  platform: Platform;
  handle: string | null;
  expires_at: string | null;
};

export async function upsertAccount(row: {
  userId: string;
  platform: Platform;
  platformUserId: string;
  handle?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scopes?: string | null;
  meta?: Record<string, unknown>;
}): Promise<StoredAccount> {
  const { data, error } = await (supabaseAdmin as any)
    .from("social_accounts")
    .upsert(
      {
        user_id: row.userId,
        platform: row.platform,
        platform_user_id: row.platformUserId,
        handle: row.handle ?? null,
        access_token: row.accessToken,
        refresh_token: row.refreshToken ?? null,
        expires_at: row.expiresAt ? row.expiresAt.toISOString() : null,
        scopes: row.scopes ?? null,
        meta: row.meta ?? {},
        revoked_at: null,
      },
      { onConflict: "user_id,platform,platform_user_id" },
    )
    .select("id, platform, handle, expires_at")
    .single();
  if (error) throw new Error(error.message);
  return data as StoredAccount;
}
