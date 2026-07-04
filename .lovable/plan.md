# Cloud Storage Sync

Let users push their saved Zentry Qor assets to **their own** Google Drive or OneDrive. One-click manual export from the Saved page, plus an optional auto-sync toggle in Settings. Free plan capped, Premium unlimited.

Google Drive and OneDrive both require **per-user OAuth** (the built-in Lovable connectors authenticate the workspace owner, not each end user). So we build a small OAuth broker into the app for each provider.

## What the user gets

- **Settings → Cloud Storage**
  - "Connect Google Drive" and "Connect OneDrive" buttons (OAuth popup)
  - Shows connected account email, connected-since date, disconnect button
  - "Auto-sync new saves" toggle per provider
  - Destination folder name (default: `Zentry Qor`)
- **Saved page**
  - New "Export to cloud" split button on each asset (Google Drive / OneDrive)
  - Bulk "Sync all saved" action in the header
  - Small status chip: `12/25 synced today` for Free users
- **Auto-sync**: when a user saves an asset, if auto-sync is on and quota allows, the file is queued and uploaded server-side to the linked destination
- **Limits**: Free = 15 syncs/day total across providers; Premium = unlimited. Hitting the cap surfaces an upgrade prompt reusing the existing `DownloadLimitModal` pattern

## Technical design

### Database (one migration)

- `cloud_connections` — one row per (user, provider): `provider` (`google_drive` | `onedrive`), `account_email`, `access_token`, `refresh_token`, `token_expires_at`, `destination_folder_id`, `destination_folder_name`, `auto_sync` bool, timestamps. RLS: user reads/writes own; tokens never exposed to client (fetched server-side only).
- `cloud_sync_logs` — one row per sync attempt: `provider`, `asset_id`, `status` (`ok` | `error` | `skipped_quota`), `remote_file_id`, `error_message`, `bytes`, timestamps. Used for history + daily quota counting.
- Reuse `is_premium()` + new SQL helper `claim_cloud_sync(_provider)` that atomically checks the 15/day Free cap (mirrors `claim_asset_download`).

### OAuth (per-user, custom)

Both providers need OAuth apps the user (project owner) creates once:
- **Google**: OAuth client in Google Cloud Console with `https://www.googleapis.com/auth/drive.file` scope (only files the app creates — safest scope).
- **Microsoft**: App registration in Entra ID with `Files.ReadWrite.AppFolder` + `offline_access`.

The app owner adds four secrets (I'll request them with `add_secret` after this plan is approved):
`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `MICROSOFT_OAUTH_CLIENT_ID`, `MICROSOFT_OAUTH_CLIENT_SECRET`.

Server routes handle the flow:
- `GET /api/public/cloud/{provider}/start` — signed-in user; creates state, redirects to provider consent
- `GET /api/public/cloud/{provider}/callback` — exchanges code, stores tokens in `cloud_connections`, redirects back to Settings
- Server-only helpers refresh tokens transparently before each upload

### Upload logic

- `src/lib/cloud-sync.server.ts`
  - `uploadAssetToDrive(userId, assetId)` — downloads the asset bytes from the private `assets` bucket via signed URL, POSTs to Drive `files/upload?uploadType=multipart` inside the destination folder
  - `uploadAssetToOneDrive(userId, assetId)` — same shape against Graph `/me/drive/special/approot:/{name}:/content` (uses AppFolder scope so the app can't see other files)
  - Both refresh tokens on 401, log to `cloud_sync_logs`
- `src/lib/cloud.functions.ts` — auth'd server fns: `listCloudConnections`, `disconnectCloudProvider`, `setAutoSync`, `syncAssetNow({assetId, provider})`, `bulkSyncSaved({provider})`, `listSyncHistory`
- Auto-sync hook: when `asset_saves` insert happens, the existing save handler calls `syncAssetNow` fire-and-forget for every connection with `auto_sync=true` (respects quota, silent on cap-hit)

### UI

- New route `src/routes/_authenticated/cloud-sync.tsx` (Settings-style page) — connect/disconnect, auto-sync switches, destination folder name, recent sync history table
- Link in `ProfileMenu` under "API keys" → "Cloud sync"
- `src/components/CloudExportButton.tsx` — dropdown button used on `assets.$id.tsx` and `saved.tsx`
- Header CTA on `saved.tsx` for bulk sync with progress toast

### Files to create / edit

**Create**
- `supabase/migrations/<ts>_cloud_sync.sql`
- `src/routes/api/public/cloud/google_drive.start.ts`, `google_drive.callback.ts`, `onedrive.start.ts`, `onedrive.callback.ts`
- `src/lib/cloud-sync.server.ts`, `src/lib/cloud.functions.ts`
- `src/routes/_authenticated/cloud-sync.tsx`
- `src/components/CloudExportButton.tsx`

**Edit**
- `src/components/ProfileMenu.tsx` — add Cloud Sync link
- `src/routes/_authenticated/saved.tsx` — bulk sync + per-item export button
- `src/routes/_authenticated/assets.$id.tsx` — export button
- `src/lib/assets.functions.ts` — trigger auto-sync on save

## What I need from you before I build

Two things:

1. **Confirm this plan** (any changes to scope, limits, or provider list).
2. After you approve, I'll ask you to paste four secrets — the Google + Microsoft OAuth client IDs and secrets from consoles you control. I'll walk you through creating the OAuth apps (redirect URIs, scopes) before requesting them so you have everything ready.

## Out of scope for this pass

- Dropbox / S3 (can add later with the same shape)
- Two-way sync / editing files back from cloud → app
- Sharing links, permissions management on the cloud side
- Team/shared drives (personal Drive + personal OneDrive only)
