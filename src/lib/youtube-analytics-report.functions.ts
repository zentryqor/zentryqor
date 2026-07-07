import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type YouTubeAnalyticsReport = {
  rangeDays: number;
  totals: {
    subscribers: number;
    hiddenSubs: boolean;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    videos: number;
  };
  recentViews: {
    last7Days: number;
    daily: { date: string; views: number }[];
  } | null;
  latestCreation: {
    id: string;
    title: string;
    thumbnail: string | null;
    publishedAt: string;
    views: number;
    likes: number;
    comments: number;
  } | null;
  topShorts: {
    id: string;
    title: string;
    thumbnail: string | null;
    views: number;
  }[];
  topVideos: {
    id: string;
    title: string;
    thumbnail: string | null;
    views: number;
    publishedAt: string;
    duration: string | null;
  }[];
  audience: {
    ageGender: { bucket: string; male: number; female: number; other: number }[];
    countries: { country: string; views: number; share: number }[];
    countriesTrend: {
      dates: string[];
      series: { country: string; views: number[]; total: number }[];
    } | null;
  } | null;
  scopeMissing: boolean;
};

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export const getYouTubeAnalyticsReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number } | undefined) => {
    const d = Number(input?.days ?? 7);
    const days = [7, 14, 30].includes(d) ? d : 7;
    return { days };
  })
  .handler(async ({ data, context }): Promise<YouTubeAnalyticsReport> => {
    const { days } = data;
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { refreshYouTubeToken } = await import("@/lib/youtube.server");

    const { data: row, error } = await (supabaseAdmin as any)
      .from("social_accounts")
      .select(
        "id, user_id, access_token, refresh_token, expires_at, handle, scopes, connected_at, revoked_at",
      )
      .eq("user_id", context.userId)
      .eq("platform", "youtube")
      .is("revoked_at", null)
      .order("connected_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("YouTube isn't connected yet.");

    let token = await refreshYouTubeToken(row);

    // Fetch helper that auto-refreshes the access token on 401 and retries
    // once. Combined with refreshYouTubeToken this makes the connection
    // effectively never-expiring.
    const ytFetch = async (url: string) => {
      let r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (r.status === 401) {
        token = await refreshYouTubeToken(row, { force: true });
        r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      }
      const j: any = await r.json().catch(() => ({}));
      return { ok: r.ok, status: r.status, json: j };
    };

    // Channel + uploads playlist
    const ch = await ytFetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true",
    );
    if (!ch.ok) {
      throw new Error(
        `YouTube channel fetch failed (${ch.status}): ${JSON.stringify(ch.json).slice(0, 200)}`,
      );
    }
    const channel = ch.json.items?.[0];
    if (!channel) throw new Error("No YouTube channel on this account");
    const uploads =
      channel.contentDetails?.relatedPlaylists?.uploads ?? null;

    let videoIds: string[] = [];
    if (uploads) {
      const p = await ytFetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${uploads}`,
      );
      videoIds = (p.json.items ?? [])
        .map((i: any) => i.contentDetails?.videoId)
        .filter(Boolean);
    }

    let videos: any[] = [];
    if (videoIds.length > 0) {
      const v = await ytFetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(",")}`,
      );
      videos = v.json.items ?? [];
    }

    const parseDurSec = (iso: string | null | undefined) => {
      if (!iso) return 0;
      const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!m) return 0;
      return (
        Number(m[1] ?? 0) * 3600 +
        Number(m[2] ?? 0) * 60 +
        Number(m[3] ?? 0)
      );
    };

    const mapped = videos.map((v) => ({
      id: v.id as string,
      title: (v.snippet?.title as string) ?? "Untitled",
      thumbnail:
        v.snippet?.thumbnails?.medium?.url ??
        v.snippet?.thumbnails?.default?.url ??
        null,
      publishedAt: (v.snippet?.publishedAt as string) ?? "",
      views: Number(v.statistics?.viewCount ?? 0),
      likes: Number(v.statistics?.likeCount ?? 0),
      comments: Number(v.statistics?.commentCount ?? 0),
      duration: (v.contentDetails?.duration as string) ?? null,
      durationSec: parseDurSec(v.contentDetails?.duration),
    }));

    const shorts = mapped
      .filter((m) => m.durationSec > 0 && m.durationSec <= 60)
      .sort((a, b) => b.views - a.views)
      .slice(0, 6)
      .map(({ durationSec, ...rest }) => rest);

    const longVideos = mapped
      .filter((m) => m.durationSec > 60)
      .sort((a, b) => b.views - a.views)
      .slice(0, 6)
      .map(({ durationSec, likes, comments, ...rest }) => rest);

    const latest = mapped
      .slice()
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() -
          new Date(a.publishedAt).getTime(),
      )[0];

    let recentViews: YouTubeAnalyticsReport["recentViews"] = null;
    let audience: YouTubeAnalyticsReport["audience"] = null;
    let shares = 0;
    let scopeMissing = false;

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));

    const daily = await ytFetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&metrics=views,shares&dimensions=day&startDate=${iso(start)}&endDate=${iso(end)}&sort=day`,
    );
    if (daily.ok && Array.isArray(daily.json.rows)) {
      const rows: any[] = daily.json.rows;
      let total = 0;
      let sharesSum = 0;
      const dailyArr = rows.map((r) => {
        total += Number(r[1] ?? 0);
        sharesSum += Number(r[2] ?? 0);
        return { date: String(r[0]), views: Number(r[1] ?? 0) };
      });
      recentViews = { last7Days: total, daily: dailyArr };
      shares = sharesSum;
    } else if (daily.status === 403 || daily.status === 401) {
      scopeMissing = true;
    }

    if (!scopeMissing) {
      const lifetime = await ytFetch(
        `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&metrics=shares&startDate=2005-01-01&endDate=${iso(end)}`,
      );
      if (lifetime.ok && lifetime.json.rows?.[0]?.[0] != null) {
        shares = Number(lifetime.json.rows[0][0]);
      }
    }

    if (!scopeMissing) {
      const audStart = new Date();
      audStart.setDate(end.getDate() - 90);
      const ag = await ytFetch(
        `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&metrics=viewerPercentage&dimensions=ageGroup,gender&startDate=${iso(audStart)}&endDate=${iso(end)}`,
      );
      const ctr = await ytFetch(
        `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&metrics=views&dimensions=country&startDate=${iso(audStart)}&endDate=${iso(end)}&sort=-views&maxResults=6`,
      );
      // Country time-series over the selected range (day x country).
      const ctrTrend = await ytFetch(
        `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&metrics=views&dimensions=day,country&startDate=${iso(start)}&endDate=${iso(end)}&maxResults=2000`,
      );

      let ageGender: { bucket: string; male: number; female: number; other: number }[] = [];
      if (ag.ok && Array.isArray(ag.json.rows)) {
        const buckets = new Map<string, { male: number; female: number; other: number }>();
        for (const r of ag.json.rows as any[]) {
          const bucket = String(r[0]).replace(/^age/, "");
          const gender = String(r[1] ?? "").toLowerCase();
          const pct = Number(r[2] ?? 0);
          const cur =
            buckets.get(bucket) ?? { male: 0, female: 0, other: 0 };
          if (gender === "male") cur.male += pct;
          else if (gender === "female") cur.female += pct;
          else cur.other += pct;
          buckets.set(bucket, cur);
        }
        ageGender = Array.from(buckets.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([bucket, v]) => ({ bucket, ...v }));
      }

      let countries: { country: string; views: number; share: number }[] = [];
      if (ctr.ok && Array.isArray(ctr.json.rows)) {
        const rows = ctr.json.rows as any[];
        const total = rows.reduce((s, r) => s + Number(r[1] ?? 0), 0) || 1;
        countries = rows.map((r) => ({
          country: String(r[0]),
          views: Number(r[1] ?? 0),
          share: Number(r[1] ?? 0) / total,
        }));
      }

      let countriesTrend:
        | { dates: string[]; series: { country: string; views: number[]; total: number }[] }
        | null = null;
      if (ctrTrend.ok && Array.isArray(ctrTrend.json.rows) && countries.length) {
        const dates: string[] = [];
        for (let i = 0; i < days; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          dates.push(iso(d));
        }
        const dateIdx = new Map(dates.map((d, i) => [d, i]));
        const topSet = new Set(countries.slice(0, 5).map((c) => c.country));
        const byCountry = new Map<string, number[]>();
        for (const c of topSet) byCountry.set(c, new Array(days).fill(0));
        for (const r of ctrTrend.json.rows as any[]) {
          const d = String(r[0]);
          const c = String(r[1]);
          const v = Number(r[2] ?? 0);
          const idx = dateIdx.get(d);
          if (idx == null || !byCountry.has(c)) continue;
          byCountry.get(c)![idx] += v;
        }
        const series = Array.from(byCountry.entries())
          .map(([country, views]) => ({
            country,
            views,
            total: views.reduce((s, v) => s + v, 0),
          }))
          .sort((a, b) => b.total - a.total);
        countriesTrend = { dates, series };
      }

      if (ageGender.length || countries.length) {
        audience = { ageGender, countries, countriesTrend };
      }
    }

    const totalLikes = mapped.reduce((s, m) => s + m.likes, 0);
    const totalComments = mapped.reduce((s, m) => s + m.comments, 0);

    return {
      rangeDays: days,
      totals: {
        subscribers: Number(channel.statistics?.subscriberCount ?? 0),
        hiddenSubs: !!channel.statistics?.hiddenSubscriberCount,
        views: Number(channel.statistics?.viewCount ?? 0),
        likes: totalLikes,
        comments: totalComments,
        shares,
        videos: Number(channel.statistics?.videoCount ?? 0),
      },
      recentViews,
      latestCreation: latest
        ? {
            id: latest.id,
            title: latest.title,
            thumbnail: latest.thumbnail,
            publishedAt: latest.publishedAt,
            views: latest.views,
            likes: latest.likes,
            comments: latest.comments,
          }
        : null,
      topShorts: shorts,
      topVideos: longVideos,
      audience,
      scopeMissing,
    };
  });
