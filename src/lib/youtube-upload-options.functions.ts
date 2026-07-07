import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type YouTubeUploadOptions = {
  playlists: { id: string; title: string; itemCount: number }[];
  categories: { id: string; title: string }[];
  channelCountry: string | null;
  madeForKidsRequired: boolean; // if true, we can't offer "not made for kids" toggle
};

export const getYouTubeUploadOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<YouTubeUploadOptions> => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { refreshYouTubeToken } = await import("@/lib/youtube.server");

    const { data: row, error } = await (supabaseAdmin as any)
      .from("social_accounts")
      .select(
        "id, user_id, access_token, refresh_token, expires_at, revoked_at",
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

    // Channel: get country to fetch matching categories
    const chRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const chJson: any = await chRes.json();
    const country = chJson.items?.[0]?.snippet?.country ?? "US";

    // Playlists (mine)
    const playlists: YouTubeUploadOptions["playlists"] = [];
    try {
      let pageToken: string | undefined = undefined;
      for (let i = 0; i < 5; i++) {
        const url = new URL(
          "https://www.googleapis.com/youtube/v3/playlists",
        );
        url.searchParams.set("part", "snippet,contentDetails");
        url.searchParams.set("mine", "true");
        url.searchParams.set("maxResults", "50");
        if (pageToken) url.searchParams.set("pageToken", pageToken);
        const r = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!r.ok) break;
        const j: any = await r.json();
        for (const it of j.items ?? []) {
          playlists.push({
            id: it.id,
            title: it.snippet?.title ?? "Untitled playlist",
            itemCount: Number(it.contentDetails?.itemCount ?? 0),
          });
        }
        pageToken = j.nextPageToken;
        if (!pageToken) break;
      }
    } catch {
      // playlists optional
    }

    // Video categories (assignable in country)
    const categories: YouTubeUploadOptions["categories"] = [];
    try {
      const cRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videoCategories?part=snippet&regionCode=${country}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const cJson: any = await cRes.json();
      for (const it of cJson.items ?? []) {
        if (it.snippet?.assignable) {
          categories.push({ id: it.id, title: it.snippet.title });
        }
      }
    } catch {
      // categories optional
    }

    return {
      playlists,
      categories,
      channelCountry: country,
      madeForKidsRequired: false,
    };
  });
