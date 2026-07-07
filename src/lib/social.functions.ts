import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SocialAccountRow = {
  id: string;
  platform: "youtube";
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
    z
      .object({
        platform: z.enum(["youtube"]),
        origin: z.string().url().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { providerCreds, callbackUrl } = await import(
      "@/lib/social-oauth.server"
    );
    const { getRequest } = await import("@tanstack/react-start/server");
    const { signOAuthState } = await import("@/lib/oauth-state.server");
    const { clientId, cfg } = providerCreds(data.platform);
    const request = getRequest();
    const headerOrigin = request?.headers.get("origin") ?? undefined;
    const forwardedHost =
      request?.headers.get("x-forwarded-host") ?? request?.headers.get("host");
    const forwardedProto = request?.headers.get("x-forwarded-proto") ?? "https";
    const origin =
      data.origin ??
      headerOrigin ??
      (forwardedHost
        ? `${forwardedProto}://${forwardedHost}`
        : request?.url
          ? new URL(request.url).origin
          : undefined);
    const redirectUri = callbackUrl(data.platform, origin);
    const state = signOAuthState({
      userId: context.userId,
      platform: data.platform,
    });
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: cfg.scopes.join(" "),
      state,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
    });
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
