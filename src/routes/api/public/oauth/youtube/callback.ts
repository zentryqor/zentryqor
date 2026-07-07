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

export const Route = createFileRoute("/api/public/oauth/youtube/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const err = url.searchParams.get("error");
        if (err) return html(`<h2>YouTube cancelled</h2><p>${err}</p><a href="/scheduler">Back</a>`, 400);
        if (!code || !state) return html("<h2>Missing code or state</h2>", 400);
        try {
          const { verifyOAuthState } = await import("@/lib/oauth-state.server");
          const { providerCreds, upsertAccount } = await import(
            "@/lib/social-oauth.server"
          );
          const st = verifyOAuthState(state);
          if (st.platform !== "youtube") throw new Error("Platform mismatch");
          const { clientId, clientSecret, cfg } = providerCreds("youtube");
          const redirectUri = `${url.origin}${url.pathname}`;

          const body = new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          });

          const tokenRes = await fetch(cfg.tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
          });
          const tokenJson = await tokenRes.json();
          if (!tokenRes.ok || !tokenJson.access_token) {
            throw new Error(`Token exchange failed: ${JSON.stringify(tokenJson).slice(0, 200)}`);
          }

          // Fetch channel info
          const chRes = await fetch(
            "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
            { headers: { Authorization: `Bearer ${tokenJson.access_token}` } },
          );
          const chJson = await chRes.json();
          const ch = chJson.items?.[0];
          if (!ch) throw new Error("No YouTube channel found on this Google account");

          await upsertAccount({
            userId: st.userId,
            platform: "youtube",
            platformUserId: ch.id,
            handle: ch.snippet?.customUrl ?? ch.snippet?.title ?? null,
            accessToken: tokenJson.access_token,
            refreshToken: tokenJson.refresh_token ?? null,
            expiresAt: tokenJson.expires_in
              ? new Date(Date.now() + tokenJson.expires_in * 1000)
              : null,
            scopes: tokenJson.scope ?? cfg.scopes.join(" "),
            meta: {
              channel_id: ch.id,
              channel_title: ch.snippet?.title ?? null,
              thumbnail: ch.snippet?.thumbnails?.default?.url ?? null,
            },
          });

          return html(`<h2>YouTube connected 🎉</h2><p>Taking you back to the scheduler…</p>`);
        } catch (e: any) {
          return html(
            `<h2>Couldn't connect YouTube</h2><p>${String(e?.message ?? e).slice(0, 200)}</p><a href="/scheduler">Back</a>`,
            500,
          );
        }
      },
    },
  },
});
