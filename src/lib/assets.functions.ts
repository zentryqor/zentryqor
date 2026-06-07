import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AssetRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  premium_only: boolean;
  created_at: string;
};

export const recordDownload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { asset_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("asset_downloads")
      .insert({ user_id: context.userId, asset_id: data.asset_id });
    if (error) throw error;
    return { ok: true };
  });

export const toggleSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { asset_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const existing = await supabase
      .from("asset_saves")
      .select("id")
      .eq("user_id", userId)
      .eq("asset_id", data.asset_id)
      .maybeSingle();
    if (existing.data) {
      await supabase.from("asset_saves").delete().eq("id", existing.data.id);
      return { saved: false };
    }
    const { error } = await supabase
      .from("asset_saves")
      .insert({ user_id: userId, asset_id: data.asset_id });
    if (error) throw error;
    return { saved: true };
  });

export const getMySavedIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<string[]> => {
    const { data } = await context.supabase
      .from("asset_saves")
      .select("asset_id")
      .eq("user_id", context.userId);
    return (data ?? []).map((r) => r.asset_id as string);
  });

export const getSavedAssets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<(AssetRow & { saved_at: string })[]> => {
    const { data, error } = await context.supabase
      .from("asset_saves")
      .select("created_at, assets(*)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? [])
      .filter((r: any) => r.assets)
      .map((r: any) => ({ ...(r.assets as AssetRow), saved_at: r.created_at as string }));
  });

export const getAssetDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [assetRes, savedRes, dlRes] = await Promise.all([
      supabase.from("assets").select("*").eq("id", data.id).maybeSingle(),
      supabase.from("asset_saves").select("id").eq("user_id", userId).eq("asset_id", data.id).maybeSingle(),
      supabase
        .from("asset_downloads")
        .select("created_at")
        .eq("user_id", userId)
        .eq("asset_id", data.id)
        .order("created_at", { ascending: false }),
    ]);
    if (assetRes.error) throw assetRes.error;
    return {
      asset: assetRes.data as AssetRow | null,
      saved: !!savedRes.data,
      downloadCount: dlRes.data?.length ?? 0,
      lastDownloadedAt: (dlRes.data?.[0]?.created_at as string | undefined) ?? null,
    };
  });
