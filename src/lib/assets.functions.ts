import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAppwriteAuth } from "@/integrations/appwrite/auth-middleware";

const assetIdSchema = z.object({ asset_id: z.string().uuid() });
const idSchema = z.object({ id: z.string().uuid() });

export type FeedAsset = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  premium_only: boolean;
  thumbnail_url: string | null;
  download_count?: number;
};

export type ActivityItem = {
  kind: "download" | "save";
  asset_id: string;
  asset_title: string;
  asset_category: string;
  created_at: string;
};

export type DashboardFeed = {
  recommended: FeedAsset[];
  trending: FeedAsset | null;
  recent_activity: ActivityItem[];
  total_assets: number;
  categories: string[];
};

export type AssetRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  file_name: string;
  storage_path: string;
  thumbnail_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  premium_only: boolean;
  created_at: string;
};

export const FREE_DAILY_DOWNLOAD_LIMIT = 3;

export const recordDownload = createServerFn({ method: "POST" })
  .middleware([requireAppwriteAuth])
  .inputValidator((d) => assetIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: claimRows, error } = await context.supabase.rpc("claim_asset_download", {
      _asset_id: data.asset_id,
      _daily_limit: FREE_DAILY_DOWNLOAD_LIMIT,
    });
    if (error) throw error;
    const claim = claimRows?.[0];
    if (!claim?.allowed) throw new Error(claim?.message ?? "Daily download limit reached");
    return { ok: true, claim };
  });

export const toggleSave = createServerFn({ method: "POST" })
  .middleware([requireAppwriteAuth])
  .inputValidator((d) => assetIdSchema.parse(d))
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
  .middleware([requireAppwriteAuth])
  .handler(async ({ context }): Promise<string[]> => {
    const { data } = await context.supabase
      .from("asset_saves")
      .select("asset_id")
      .eq("user_id", context.userId);
    return (data ?? []).map((r) => r.asset_id as string);
  });

export const getSavedAssets = createServerFn({ method: "GET" })
  .middleware([requireAppwriteAuth])
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
  .middleware([requireAppwriteAuth])
  .inputValidator((d) => idSchema.parse(d))
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
    const asset = assetRes.data as AssetRow | null;
    let thumbnailUrl: string | null = null;
    if (asset?.thumbnail_path) {
      const { data: signed } = await supabase.storage
        .from("assets")
        .createSignedUrl(asset.thumbnail_path, 3600);
      thumbnailUrl = signed?.signedUrl ?? null;
    }
    return {
      asset,
      thumbnailUrl,
      saved: !!savedRes.data,
      downloadCount: dlRes.data?.length ?? 0,
      lastDownloadedAt: (dlRes.data?.[0]?.created_at as string | undefined) ?? null,
    };
  });

async function signThumbs(supabase: any, paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const clean = paths.filter(Boolean);
  if (clean.length === 0) return map;
  const { data } = await supabase.storage.from("assets").createSignedUrls(clean, 3600);
  (data ?? []).forEach((s: any) => {
    if (s.path && s.signedUrl) map.set(s.path, s.signedUrl);
  });
  return map;
}

export const getDashboardFeed = createServerFn({ method: "GET" })
  .middleware([requireAppwriteAuth])
  .handler(async ({ context }): Promise<DashboardFeed> => {
    const { supabase, userId } = context;

    const [prefsRes, assetsRes, dlCountsRes, recentDlRes, recentSaveRes] = await Promise.all([
      supabase.from("creator_preferences").select("interests,platforms,niche").eq("user_id", userId).maybeSingle(),
      supabase.from("assets").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("asset_downloads").select("asset_id"),
      supabase
        .from("asset_downloads")
        .select("created_at, asset_id, assets(title, category)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(15),
      supabase
        .from("asset_saves")
        .select("created_at, asset_id, assets(title, category)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(15),
    ]);

    const allAssets = (assetsRes.data ?? []) as any[];
    const dlCounts = new Map<string, number>();
    ((dlCountsRes.data ?? []) as { asset_id: string }[]).forEach((r) => {
      dlCounts.set(r.asset_id, (dlCounts.get(r.asset_id) ?? 0) + 1);
    });

    const interests: string[] = (prefsRes.data?.interests as string[] | undefined) ?? [];
    const niche: string = (prefsRes.data?.niche as string | undefined) ?? "";
    const matchScore = (a: any) => {
      const hay = `${a.category} ${a.title} ${(a.tags ?? []).join(" ")} ${a.description ?? ""}`.toLowerCase();
      let s = 0;
      interests.forEach((i) => { if (i && hay.includes(i.toLowerCase())) s += 3; });
      if (niche && hay.includes(niche.toLowerCase())) s += 4;
      return s + (dlCounts.get(a.id) ?? 0) * 0.1;
    };

    const ranked = [...allAssets].sort((a, b) => matchScore(b) - matchScore(a));
    const recommended = ranked.slice(0, 4);

    const trending = [...allAssets].sort(
      (a, b) => (dlCounts.get(b.id) ?? 0) - (dlCounts.get(a.id) ?? 0),
    )[0] ?? allAssets[0] ?? null;

    const thumbPaths = [
      ...recommended.map((a) => a.thumbnail_path).filter(Boolean) as string[],
      ...(trending?.thumbnail_path ? [trending.thumbnail_path] : []),
    ];
    const thumbMap = await signThumbs(supabase, thumbPaths);

    const toFeed = (a: any): FeedAsset => ({
      id: a.id,
      title: a.title,
      description: a.description,
      category: a.category,
      tags: a.tags ?? [],
      premium_only: !!a.premium_only,
      thumbnail_url: a.thumbnail_path ? (thumbMap.get(a.thumbnail_path) ?? null) : null,
      download_count: dlCounts.get(a.id) ?? 0,
    });

    const activity: ActivityItem[] = [];
    ((recentDlRes.data ?? []) as any[]).forEach((r) => {
      if (!r.assets) return;
      activity.push({
        kind: "download",
        asset_id: r.asset_id,
        asset_title: r.assets.title,
        asset_category: r.assets.category,
        created_at: r.created_at,
      });
    });
    ((recentSaveRes.data ?? []) as any[]).forEach((r) => {
      if (!r.assets) return;
      activity.push({
        kind: "save",
        asset_id: r.asset_id,
        asset_title: r.assets.title,
        asset_category: r.assets.category,
        created_at: r.created_at,
      });
    });
    activity.sort((a, b) => b.created_at.localeCompare(a.created_at));

    const categories = Array.from(new Set(allAssets.map((a) => a.category))).sort();

    return {
      recommended: recommended.map(toFeed),
      trending: trending ? toFeed(trending) : null,
      recent_activity: activity.slice(0, 12),
      total_assets: allAssets.length,
      categories,
    };
  });
