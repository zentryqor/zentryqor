import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SocialAccountRow = {
  id: string;
  platform: "tiktok" | "instagram" | "youtube";
  handle: string | null;
  expires_at: string | null;
  scopes: string | null;
  meta: Record<string, any>;
  connected_at: string;
  revoked_at: string | null;
};

export const listSocialAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("social_accounts_public")
      .select("id, platform, handle, expires_at, scopes, meta, connected_at, revoked_at")
      .order("connected_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as any as SocialAccountRow[];
  });

export const startSocialOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ platform: z.enum(["tiktok", "instagram", "youtube"]) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { PROVIDERS, providerCreds, callbackUrl } = await import(
      "@/lib/social-oauth.server"
    );
    const { signOAuthState, makePkcePair } = await import(
      "@/lib/oauth-state.server"
    );
    const { clientId, cfg } = providerCreds(data.platform);
    const pkce = cfg.usesPkce ? makePkcePair() : null;
    const state = signOAuthState({
      userId: context.userId,
      platform: data.platform,
      codeVerifier: pkce?.verifier,
    });
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: callbackUrl(data.platform),
      scope: cfg.scopes.join(data.platform === "tiktok" ? "," : " "),
      state,
    });
    if (data.platform === "tiktok") {
      params.set("client_key", clientId);
      params.delete("client_id");
    }
    if (data.platform === "youtube") {
      params.set("access_type", "offline");
      params.set("prompt", "consent");
      params.set("include_granted_scopes", "true");
    }
    if (pkce) {
      params.set("code_challenge", pkce.challenge);
      params.set("code_challenge_method", "S256");
    }
    return { url: `${cfg.authorizeUrl}?${params.toString()}` };
  });

export const disconnectSocialAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    // Owner check via RLS on the underlying table
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await (supabaseAdmin as any)
      .from("social_accounts")
      .select("id, user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!row || row.user_id !== context.userId) throw new Error("Not found");
    await (supabaseAdmin as any)
      .from("social_accounts")
      .update({ revoked_at: new Date().toISOString(), access_token: "", refresh_token: null })
      .eq("id", data.id);
    return { ok: true };
  });
