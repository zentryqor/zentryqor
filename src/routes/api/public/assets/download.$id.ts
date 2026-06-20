import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const FREE_DAILY_DOWNLOAD_LIMIT = 3;

function createUserClient(token: string) {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    },
  );
}

export const Route = createFileRoute("/api/public/assets/download/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const auth = request.headers.get("authorization");
        const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
        if (!token) return jsonError(401, "Please sign in again to download this asset.");

        const supabase = createUserClient(token);
        const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
        const userId = claims?.claims?.sub;
        if (claimsError || !userId) return jsonError(401, "Please sign in again to download this asset.");

        const { data: asset, error: assetError } = await supabase
          .from("assets")
          .select("id, file_name, storage_path, premium_only")
          .eq("id", params.id)
          .maybeSingle();

        if (assetError) return jsonError(400, assetError.message);
        if (!asset) return jsonError(404, "Asset not found or locked.");

        const { data: premium } = await supabase.rpc("is_premium", { _user_id: userId });
        if (asset.premium_only && !premium) return jsonError(403, "Premium membership required");

        const { data: claimRows, error: claimError } = await supabase.rpc("claim_asset_download", {
          _asset_id: asset.id,
          _daily_limit: FREE_DAILY_DOWNLOAD_LIMIT,
        });
        if (claimError) return jsonError(400, claimError.message);
        const claim = claimRows?.[0];
        if (!claim?.allowed) {
          return jsonError(claim?.message === "Premium membership required." ? 403 : 429, claim?.message ?? "Daily download limit reached", {
            downloadsUsed: claim?.downloads_used ?? FREE_DAILY_DOWNLOAD_LIMIT,
            downloadsRemaining: claim?.downloads_remaining ?? 0,
            dailyLimit: claim?.daily_limit ?? FREE_DAILY_DOWNLOAD_LIMIT,
            resetAt: claim?.reset_at ?? null,
          });
        }

        const { data: signed, error: signError } = await supabase.storage
          .from("assets")
          .createSignedUrl(asset.storage_path, 60, { download: asset.file_name });
        if (signError || !signed?.signedUrl) return jsonError(404, signError?.message ?? "Download failed");

        return Response.json({
          url: signed.signedUrl,
          filename: asset.file_name,
          downloadsUsed: claim.downloads_used,
          downloadsRemaining: claim.downloads_remaining,
          dailyLimit: claim.daily_limit,
          resetAt: claim.reset_at,
        });
      },
    },
  },
});

function jsonError(status: number, message: string, details?: Record<string, unknown>) {
  return new Response(JSON.stringify({ error: message, ...details }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
