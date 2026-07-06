# Native scheduler — per-user OAuth for TikTok, Reels, Shorts

## Reality check (read first)

Auto-publishing to these three platforms requires **your own OAuth apps** on each provider — the Lovable connectors sign in as the workspace owner, not each end user, so they can't be used here.

| Platform | What we register | Review needed to publish for real users |
|---|---|---|
| TikTok | TikTok for Developers app, `video.publish` + `video.upload` scopes | Yes — TikTok Content Posting API review (days–weeks) |
| Instagram Reels | Meta app, Instagram Graph API, `instagram_content_publish` + `pages_show_list` + `business_management` | Yes — Meta App Review + Business Verification (1–3 weeks). Only Business/Creator IG accounts linked to a Facebook Page can post. |
| YouTube Shorts | Google Cloud OAuth client, `youtube.upload` scope | Yes — Google security assessment for sensitive scope (weeks) and CASA if scale grows |

Until each review clears, publishing works in **sandbox/test-user mode only**. The scheduler UI, storage, connection flow, and cron worker all work day 1 — we just can't guarantee a random signed-up user can post to their real IG until Meta approves the app.

I'll build the whole system now with sandbox credentials and give you a checklist to submit each app for review. That's the honest path.

## Scope

### New database (one migration)

- `social_accounts` — one row per user × platform connection
  - `user_id`, `platform` (`tiktok`|`instagram`|`youtube`), `platform_user_id`, `handle`, `access_token` (encrypted), `refresh_token` (encrypted), `expires_at`, `scopes`, `meta` (jsonb — page_id for IG, channel_id for YT), `connected_at`, `revoked_at`
- `scheduled_posts` — one row per queued post
  - `user_id`, `caption`, `video_url` (Supabase Storage path), `thumbnail_url`, `scheduled_for`, `status` (`draft`|`queued`|`publishing`|`published`|`failed`|`canceled`), `error`, `created_at`, `updated_at`
- `scheduled_post_targets` — fan-out per platform
  - `scheduled_post_id`, `platform`, `social_account_id`, `platform_post_id` (after publish), `status`, `error`, `published_at`
- Storage bucket `social-uploads` (private, RLS: owner read/write)
- All tables: RLS scoped to `auth.uid()`, GRANTs to `authenticated` + `service_role`, encrypted token columns via `pgsodium` or app-layer AES

### New OAuth callback routes (public, signature-safe)

- `src/routes/api/public/oauth/tiktok/start.ts` + `callback.ts`
- `src/routes/api/public/oauth/instagram/start.ts` + `callback.ts`
- `src/routes/api/public/oauth/youtube/start.ts` + `callback.ts`

Each: signed `state` (HMAC of `user_id`+nonce+expiry), PKCE where the provider supports it, token exchange, upsert into `social_accounts`. Refresh handled by a helper in `src/lib/social-tokens.server.ts`.

### New pages (authenticated)

- `/scheduler` — calendar/list view, "New post" button, connection status cards
- `/scheduler/new` — upload video → Supabase Storage, caption, per-platform toggles (only enabled if that platform is connected), datetime picker
- `/scheduler/$id` — detail, per-target status, retry, cancel, delete
- `/scheduler/connections` — connect/disconnect buttons per platform, shows handle + scopes + expiry

Dock gets a "Scheduler" entry.

### Publish worker

- `src/lib/scheduler.server.ts` with `publishDuePosts()` — one function per platform:
  - TikTok: `POST /v2/post/publish/video/init/` → PULL_FROM_URL with signed Supabase Storage URL → poll status
  - Instagram: create media container `POST /{ig-user-id}/media` (`media_type=REELS`, `video_url=`) → poll `status_code` → `POST /{ig-user-id}/media_publish`
  - YouTube: resumable upload `POST /upload/youtube/v3/videos` with `snippet` + `status.privacyStatus=public` (Shorts = ≤60s vertical)
- Cron: extend existing `pg_cron` to hit new `src/routes/api/public/hooks/run-scheduler.ts` every minute
- Idempotency via `status='publishing'` row lock

### Secrets to request

Six env vars (three client-ID/secret pairs). I'll request them with `add_secret` when the OAuth routes are wired. Callback URLs will be on `zentryqor.lovable.app` so you can copy them straight into each provider console.

## Phasing (so you get something usable this week)

1. **DB + storage + connections UI + OAuth flows** (this build) — you can connect real TikTok/IG/YT accounts, tokens stored and refreshed.
2. **Scheduler UI + upload + cron worker + TikTok publish** — TikTok is the fastest to get through review; ship real posting first.
3. **Instagram Reels publish** — after Meta review clears.
4. **YouTube Shorts publish** — after Google verification clears.

If you say go, I'll start phase 1: migration, storage bucket, connections page, and the three OAuth callback routes with signed state. Reply "go" or tell me to reorder.
