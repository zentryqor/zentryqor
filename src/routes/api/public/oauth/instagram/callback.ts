import { createFileRoute } from "@tanstack/react-router";

function html(body: string, status = 200) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Connected</title>
<style>body{font-family:system-ui;background:#0a0a0a;color:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}
.card{max-width:420px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:28px}
a{color:#fff;text-decoration:underline}</style>
<div class="card">${body}</div>
<script>setTimeout(()=>{location.href='/scheduler'},1800)</script>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/public/oauth/instagram/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const err = url.searchParams.get("error");
        if (err) return html(`<h2>Instagram cancelled</h2><p>${err}</p><a href="/scheduler">Back</a>`, 400);
        if (!code || !state) return html("<h2>Missing code or state</h2>", 400);
        try {
          const { verifyOAuthState } = await import("@/lib/oauth-state.server");
          const { providerCreds, callbackUrl, upsertAccount } = await import(
            "@/lib/social-oauth.server"
          );
          const st = verifyOAuthState(state);
          if (st.platform !== "instagram") throw new Error("Platform mismatch");
          const { clientId, clientSecret } = providerCreds("instagram");

          // Exchange code → short-lived token
          const tokenUrl = new URL("https://graph.facebook.com/v20.0/oauth/access_token");
          tokenUrl.searchParams.set("client_id", clientId);
          tokenUrl.searchParams.set("client_secret", clientSecret);
          tokenUrl.searchParams.set("redirect_uri", callbackUrl("instagram"));
          tokenUrl.searchParams.set("code", code);
          const tokenRes = await fetch(tokenUrl.toString());
          const tokenJson = await tokenRes.json();
          if (!tokenRes.ok || !tokenJson.access_token) {
            throw new Error(`Token exchange failed: ${JSON.stringify(tokenJson).slice(0, 200)}`);
          }

          // Upgrade to long-lived (~60 days) token
          const longUrl = new URL("https://graph.facebook.com/v20.0/oauth/access_token");
          longUrl.searchParams.set("grant_type", "fb_exchange_token");
          longUrl.searchParams.set("client_id", clientId);
          longUrl.searchParams.set("client_secret", clientSecret);
          longUrl.searchParams.set("fb_exchange_token", tokenJson.access_token);
          const longRes = await fetch(longUrl.toString());
          const longJson = await longRes.json();
          const accessToken = longJson.access_token ?? tokenJson.access_token;
          const expiresIn = longJson.expires_in ?? tokenJson.expires_in ?? null;

          // Fetch pages to find IG business account
          const pagesRes = await fetch(
            `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,instagram_business_account&access_token=${encodeURIComponent(accessToken)}`,
          );
          const pagesJson = await pagesRes.json();
          const pageWithIg = (pagesJson.data ?? []).find(
            (p: any) => p.instagram_business_account?.id,
          );

          if (!pageWithIg) {
            return html(
              `<h2>No Instagram Business account found</h2>
              <p>Instagram Reels publishing requires a Business/Creator IG account linked to a Facebook Page.</p>
              <a href="/scheduler">Back</a>`,
              400,
            );
          }

          // Get IG username
          const igId = pageWithIg.instagram_business_account.id;
          const igRes = await fetch(
            `https://graph.facebook.com/v20.0/${igId}?fields=username&access_token=${encodeURIComponent(accessToken)}`,
          );
          const igJson = await igRes.json();

          await upsertAccount({
            userId: st.userId,
            platform: "instagram",
            platformUserId: igId,
            handle: igJson.username ? `@${igJson.username}` : null,
            accessToken,
            refreshToken: null,
            expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
            scopes: null,
            meta: { page_id: pageWithIg.id, page_name: pageWithIg.name, ig_user_id: igId },
          });

          return html(`<h2>Instagram connected 🎉</h2><p>Taking you back to the scheduler…</p>`);
        } catch (e: any) {
          return html(
            `<h2>Couldn't connect Instagram</h2><p>${String(e?.message ?? e).slice(0, 200)}</p><a href="/scheduler">Back</a>`,
            500,
          );
        }
      },
    },
  },
});
