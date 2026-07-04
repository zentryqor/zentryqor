# Nine-feature rollout plan

This is a large scope (9 features, ~15-20 new routes, ~8 new tables). I'll ship it in 4 phases so you can review as we go and stop or reorder anytime. Each phase is independently useful and shippable.

## Phase 1 — API observability (builds on what we just shipped)
1. **Rate-limit dashboard** (`/api-limits`)
   - Show current tier limits (Free vs Premium): requests/min, requests/day, burst allowance
   - Live counter: "You've used X/Y this minute", reset countdown
   - Retry guidance with exponential-backoff code snippet
   - Data source: extend existing `rate_limit_buckets` table + `consume_rate_limit` RPC
2. **Detailed usage charts** (extend `/api-usage`)
   - Line chart: credits/requests over last 30 days (recharts)
   - Bar chart: per-endpoint breakdown (`/text` vs `/image` vs `/credits`)
   - Cost projection: "At current pace, you'll spend N credits this month"
   - Data source: existing `api_usage_logs`
3. **Public status page** (`/status`, public route)
   - Health check endpoint `/api/public/v1/health` pinging each upstream (OpenRouter, image gen)
   - 90-day uptime bar per endpoint (stored in new `status_checks` table, populated by cron every 5 min)
   - Current incidents banner (manual admin toggle)

## Phase 2 — Community & growth
4. **Public gallery** (`/gallery`, public)
   - Users can toggle "share to gallery" on saved outputs
   - Grid view with prompt, thumbnail, "Created with Zentry Qor" badge overlay
   - Individual shareable pages `/gallery/$id` with OG image
   - New table: `gallery_items` (public read policy, owner write)
5. **Referral program** (`/refer`)
   - Each user gets unique code `?ref=CODE` on signup
   - Referrer +10 credits, referee +5 credits (granted after referee's first successful generation)
   - Dashboard: your code, link, referrals count, credits earned
   - New tables: `referral_codes`, `referrals`
6. **Template library** (`/templates`, `/templates/$slug` public SEO pages)
   - Curated prompts: YouTube thumbnail, IG ad, LinkedIn post, product shot, blog header, etc.
   - Each template = SEO landing page with unique title/description/OG
   - "Use this template" prefills the generator
   - New table: `templates` (seeded via migration)

## Phase 3 — Productivity for logged-in users
7. **Saved generations & folders** (`/library`)
   - Save any output, organize into folders, mark favorites
   - Grid + list views, search, filter by type/folder/favorite
   - New tables: `folders`, `saved_generations` (already have `asset_saves` — extend or replace)
8. **Prompt version history**
   - Every generation stores prompt + params; user can "fork" a prompt, edit, regenerate
   - Side-by-side compare: two versions with their outputs
   - New table: `prompt_versions` linking to `saved_generations`

## Phase 4 — Automation (heaviest)
9. **Scheduled / batch generation** (`/batch`)
   - Batch: upload CSV or paste list of prompts → runs sequentially, shows progress
   - Schedule: cron-like recurrence (daily/weekly at time X) — Premium only
   - Runs on pg_cron hitting `/api/public/hooks/run-scheduled-jobs`
   - New tables: `batch_jobs`, `batch_items`, `scheduled_jobs`

## Technical notes
- All new tables get RLS + GRANTs in same migration
- Public routes (`/gallery`, `/templates/$slug`, `/status`) use publishable-key server client with `TO anon` SELECT policies for SSR + OG tags
- Owner-scoped fetchers via `requireSupabaseAuth` for dashboards
- Charts use `recharts` (already in stack)
- Status cron every 5 min via existing `pg_cron`
- Rough credit spend: Phase 1 small, Phase 2 medium, Phase 3 medium, Phase 4 largest

## Recommendation
Ship **Phase 1 first** (smallest, extends what you just built, immediate value for API users). After you review it, we do Phase 2, etc. Reply with "go" to start Phase 1, or tell me to reorder / drop / combine phases.
