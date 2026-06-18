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

        if (!premium) {
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          const { count, error: countError } = await supabase
            .from("asset_downloads")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("created_at", startOfDay.toISOString());
          if (countError) return jsonError(400, countError.message);
          if ((count ?? 0) >= FREE_DAILY_DOWNLOAD_LIMIT) {
            return jsonError(
              429,
              `Daily download limit reached (${FREE_DAILY_DOWNLOAD_LIMIT}/day on Free). Upgrade to Premium for unlimited downloads.`,
            );
          }
        }

        const { data: signed, error: signError } = await supabase.storage
          .from("assets")
          .createSignedUrl(asset.storage_path, 60, { download: asset.file_name });
        if (signError || !signed?.signedUrl) return jsonError(404, signError?.message ?? "Download failed");

        const { error: insertError } = await supabase
          .from("asset_downloads")
          .insert({ user_id: userId, asset_id: asset.id });
        if (insertError) return jsonError(400, insertError.message);

        return Response.json({ url: signed.signedUrl, filename: asset.file_name });
      },
    },
  },
});

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
