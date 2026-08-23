import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAppwriteAuth } from "@/integrations/appwrite/auth-middleware";

export type BestTimesReport = {
  accountId: string;
  handle: string | null;
  channelTitle: string | null;
  tzOffsetMinutes: number;
  sampleSize: number;
  // grid[weekday 0=Sun..6=Sat][hour 0..23] = normalized 0..1 view score
  grid: number[][];
  // top slots sorted best-first
  top: { weekday: number; hour: number; score: number; sampleViews: number }[];
};

const WEEKDAY_COUNT = 7;
const HOUR_COUNT = 24;

export const getBestPostingTimes = createServerFn({ method: "GET" })
  .middleware([requireAppwriteAuth])
  .inputValidator((input: { accountId?: string; tzOffsetMinutes?: number } | undefined) => ({
    accountId:
      input?.accountId && typeof input.accountId === "string"
        ? input.accountId
        : undefined,
    tzOffsetMinutes:
      typeof input?.tzOffsetMinutes === "number"
        ? Math.max(-14 * 60, Math.min(14 * 60, input.tzOffsetMinutes))
        : 0,
  }))
  .handler(async ({ data, context }): Promise<BestTimesReport> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { refreshYouTubeToken } = await import("@/lib/youtube.server");

    let q = (supabaseAdmin as any)
      .from("social_accounts")
      .select("id, user_id, access_token, refresh_token, expires_at, handle, meta, connected_at, revoked_at")
      .eq("user_id", context.userId)
      .eq("platform", "youtube")
      .is("revoked_at", null);
    if (data.accountId) q = q.eq("id", data.accountId);
    const { data: row, error } = await q
      .order("connected_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("YouTube isn't connected yet.");

    const token = await refreshYouTubeToken(row);
    const ytFetch = async (url: string) => {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const j: any = await r.json().catch(() => ({}));
      return { ok: r.ok, status: r.status, json: j };
    };

    const ch = await ytFetch(
      "https://www.googleapis.com/youtube/v3/channels?part=contentDetails,snippet&mine=true",
    );
    if (!ch.ok) throw new Error(`YouTube channel fetch failed (${ch.status})`);
    const channel = ch.json.items?.[0];
    if (!channel) throw new Error("No YouTube channel on this account");
    const uploads = channel.contentDetails?.relatedPlaylists?.uploads ?? null;

    // Pull up to 200 recent uploads for a solid signal.
    let videoIds: string[] = [];
    let pageToken: string | undefined;
    for (let page = 0; page < 4 && videoIds.length < 200; page++) {
      const url = new URL(
        "https://www.googleapis.com/youtube/v3/playlistItems",
      );
      url.searchParams.set("part", "contentDetails");
      url.searchParams.set("maxResults", "50");
      url.searchParams.set("playlistId", uploads);
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const p = await ytFetch(url.toString());
      if (!p.ok) break;
      videoIds.push(
        ...(p.json.items ?? [])
          .map((i: any) => i.contentDetails?.videoId)
          .filter(Boolean),
      );
      pageToken = p.json.nextPageToken;
      if (!pageToken) break;
    }

    const grid: number[][] = Array.from({ length: WEEKDAY_COUNT }, () =>
      new Array(HOUR_COUNT).fill(0),
    );
    let sampleSize = 0;

    // Fetch in chunks of 50 (YT videos.list limit)
    for (let i = 0; i < videoIds.length; i += 50) {
      const chunk = videoIds.slice(i, i + 50);
      const v = await ytFetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${chunk.join(",")}`,
      );
      if (!v.ok) continue;
      for (const item of v.json.items ?? []) {
        const publishedAt = item.snippet?.publishedAt;
        const views = Number(item.statistics?.viewCount ?? 0);
        if (!publishedAt || views <= 0) continue;
        // Shift the UTC publish time by user tz to compute their local slot.
        const utc = new Date(publishedAt).getTime();
        const local = new Date(utc + data.tzOffsetMinutes * 60_000);
        const weekday = local.getUTCDay();
        const hour = local.getUTCHours();
        grid[weekday][hour] += views;
        sampleSize++;
      }
    }

    if (sampleSize === 0) {
      return {
        accountId: row.id,
        handle: row.handle ?? null,
        channelTitle: channel.snippet?.title ?? null,
        tzOffsetMinutes: data.tzOffsetMinutes,
        sampleSize: 0,
        grid,
        top: [],
      };
    }

    // Normalize per-cell to 0..1 of max, so the heatmap is readable.
    let max = 0;
    for (const row of grid) for (const v of row) if (v > max) max = v;
    const normalized = grid.map((r) =>
      r.map((v) => (max > 0 ? Number((v / max).toFixed(4)) : 0)),
    );

    // Top slots sorted by raw score.
    const cells: {
      weekday: number;
      hour: number;
      score: number;
      sampleViews: number;
    }[] = [];
    for (let d = 0; d < WEEKDAY_COUNT; d++) {
      for (let h = 0; h < HOUR_COUNT; h++) {
        if (grid[d][h] > 0) {
          cells.push({
            weekday: d,
            hour: h,
            score: normalized[d][h],
            sampleViews: grid[d][h],
          });
        }
      }
    }
    cells.sort((a, b) => b.sampleViews - a.sampleViews);

    return {
      accountId: row.id,
      handle: row.handle ?? null,
      channelTitle: channel.snippet?.title ?? null,
      tzOffsetMinutes: data.tzOffsetMinutes,
      sampleSize,
      grid: normalized,
      top: cells.slice(0, 12),
    };
  });
