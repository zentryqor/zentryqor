import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type YouTubeChannelDetails = {
  id: string;
  title: string;
  description: string;
  handle: string | null;
  customUrl: string | null;
  thumbnail: string | null;
  banner: string | null;
  country: string | null;
  publishedAt: string | null;
  stats: {
    subscribers: number;
    views: number;
    videos: number;
    hiddenSubs: boolean;
  };
  recentVideos: {
    id: string;
    title: string;
    thumbnail: string | null;
    publishedAt: string;
    views: number;
    likes: number;
    comments: number;
    duration: string | null;
  }[];
  tokenExpiresAt: string | null;
  connectedAt: string;
};

export const getYouTubeChannelDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<YouTubeChannelDetails> => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { refreshYouTubeToken } = await import("@/lib/youtube.server");

    const { data: row, error } = await (supabaseAdmin as any)
      .from("social_accounts")
      .select(
        "id, user_id, access_token, refresh_token, expires_at, handle, connected_at, revoked_at",
      )
      .eq("user_id", context.userId)
      .eq("platform", "youtube")
      .is("revoked_at", null)
      .order("connected_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("YouTube isn't connected yet.");

    const accessToken = await refreshYouTubeToken(row);

    const chRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&mine=true",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const chJson: any = await chRes.json();
    if (!chRes.ok) {
      throw new Error(
        `YouTube channel fetch failed (${chRes.status}): ${JSON.stringify(chJson).slice(0, 200)}`,
      );
    }
    const ch = chJson.items?.[0];
    if (!ch) throw new Error("No YouTube channel on this account");

    // Recent uploads via the channel's uploads playlist
    const uploadsPlaylist =
      (await (async () => {
        const r = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${ch.id}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const j: any = await r.json();
        return j.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null;
      })()) ?? null;

    let videoIds: string[] = [];
    if (uploadsPlaylist) {
      const pRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=12&playlistId=${uploadsPlaylist}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const pJson: any = await pRes.json();
      videoIds = (pJson.items ?? [])
        .map((i: any) => i.contentDetails?.videoId)
        .filter(Boolean);
    }

    let recentVideos: YouTubeChannelDetails["recentVideos"] = [];
    if (videoIds.length > 0) {
      const vRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(",")}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const vJson: any = await vRes.json();
      recentVideos = (vJson.items ?? []).map((v: any) => ({
        id: v.id,
        title: v.snippet?.title ?? "Untitled",
        thumbnail:
          v.snippet?.thumbnails?.medium?.url ??
          v.snippet?.thumbnails?.default?.url ??
          null,
        publishedAt: v.snippet?.publishedAt ?? "",
        views: Number(v.statistics?.viewCount ?? 0),
        likes: Number(v.statistics?.likeCount ?? 0),
        comments: Number(v.statistics?.commentCount ?? 0),
        duration: v.contentDetails?.duration ?? null,
      }));
    }

    return {
      id: ch.id,
      title: ch.snippet?.title ?? "",
      description: ch.snippet?.description ?? "",
      handle: ch.snippet?.customUrl ?? row.handle ?? null,
      customUrl: ch.snippet?.customUrl ?? null,
      thumbnail:
        ch.snippet?.thumbnails?.medium?.url ??
        ch.snippet?.thumbnails?.default?.url ??
        null,
      banner:
        ch.brandingSettings?.image?.bannerExternalUrl ??
        null,
      country: ch.snippet?.country ?? null,
      publishedAt: ch.snippet?.publishedAt ?? null,
      stats: {
        subscribers: Number(ch.statistics?.subscriberCount ?? 0),
        views: Number(ch.statistics?.viewCount ?? 0),
        videos: Number(ch.statistics?.videoCount ?? 0),
        hiddenSubs: !!ch.statistics?.hiddenSubscriberCount,
      },
      recentVideos,
      tokenExpiresAt: row.expires_at,
      connectedAt: row.connected_at,
    };
  });
