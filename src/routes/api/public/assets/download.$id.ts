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

function contentDisposition(filename: string) {
  const safe = filename.replace(/["\\\r\n]/g, "_");
  return `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export const Route = createFileRoute("/api/public/assets/download/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const auth = request.headers.get("authorization");
        const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
        if (!token) return new Response("Please sign in again to download this asset.", { status: 401 });

        const supabase = createUserClient(token);
        const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
        const userId = claims?.claims?.sub;
        if (claimsError || !userId) return new Response("Please sign in again to download this asset.", { status: 401 });

        const { data: asset, error: assetError } = await supabase
          .from("assets")
          .select("id, file_name, storage_path, mime_type, premium_only")
          .eq("id", params.id)
          .maybeSingle();

        if (assetError) return new Response(assetError.message, { status: 400 });
        if (!asset) return new Response("Asset not found or locked.", { status: 404 });

        const { data: premium } = await supabase.rpc("is_premium", { _user_id: userId });
        if (asset.premium_only && !premium) return new Response("Premium membership required", { status: 403 });

        if (!premium) {
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          const { count, error: countError } = await supabase
            .from("asset_downloads")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("created_at", startOfDay.toISOString());
          if (countError) return new Response(countError.message, { status: 400 });
          if ((count ?? 0) >= FREE_DAILY_DOWNLOAD_LIMIT) {
            return new Response(
              `Daily download limit reached (${FREE_DAILY_DOWNLOAD_LIMIT}/day on Free). Upgrade to Premium for unlimited downloads.`,
              { status: 429 },
            );
          }
        }

        const { data: file, error: fileError } = await supabase.storage
          .from("assets")
          .download(asset.storage_path);
        if (fileError || !file) return new Response(fileError?.message ?? "Download failed", { status: 404 });

        const { error: insertError } = await supabase
          .from("asset_downloads")
          .insert({ user_id: userId, asset_id: asset.id });
        if (insertError) return new Response(insertError.message, { status: 400 });

        return new Response(file, {
          headers: {
            "Content-Type": asset.mime_type || file.type || "application/octet-stream",
            "Content-Disposition": contentDisposition(asset.file_name),
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});