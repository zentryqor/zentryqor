// YouTube publishing helpers (server-only).
// - refreshYouTubeToken: uses stored refresh_token to mint a new access_token.
// - publishYouTubeVideo: uploads a video from Supabase Storage to YouTube via
//   the multipart upload endpoint.
import { providerCreds } from "@/lib/social-oauth.server";

type Row = {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
};

export async function refreshYouTubeToken(
  row: Row,
  opts: { force?: boolean } = {},
): Promise<string> {
  // Treat the connection as effectively never-expiring: as long as a
  // refresh_token is on file we transparently mint a new access token
  // whenever needed. We proactively refresh anything with < 5 minutes
  // left so long-running server fns don't race the expiry.
  if (
    !opts.force &&
    row.expires_at &&
    new Date(row.expires_at).getTime() - Date.now() > 5 * 60_000
  ) {
    return row.access_token;
  }
  if (!row.refresh_token) {
    // No refresh_token — fall back to whatever access token we have and
    // let the caller retry via forceRefresh on a 401.
    if (row.access_token) return row.access_token;
    throw new Error("YouTube refresh token missing — reconnect the account.");
  }
  const { clientId, clientSecret, cfg } = providerCreds("youtube");
  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: row.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(
      `YouTube token refresh failed: ${JSON.stringify(json).slice(0, 200)}`,
    );
  }
  // Store a real expiry so we can proactively refresh next time, but the
  // connection itself is treated as unlimited from the app's perspective.
  const expires_at = json.expires_in
    ? new Date(Date.now() + json.expires_in * 1000).toISOString()
    : null;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await (supabaseAdmin as any)
    .from("social_accounts")
    .update({ access_token: json.access_token, expires_at })
    .eq("id", row.id);

  row.access_token = json.access_token;
  row.expires_at = expires_at;
  return json.access_token as string;
}



export type YouTubePublishOptions = {
  privacyStatus?: "public" | "unlisted" | "private";
  madeForKids?: boolean;
  categoryId?: string;
  tags?: string[];
  license?: "youtube" | "creativeCommon";
  embeddable?: boolean;
  publicStatsViewable?: boolean;
  notifySubscribers?: boolean;
  locationDescription?: string;
};

export async function publishYouTubeVideo(args: {
  accessToken: string;
  title: string;
  description: string;
  videoBytes: ArrayBuffer;
  videoMime: string;
  options?: YouTubePublishOptions;
}): Promise<{ videoId: string }> {
  const opts = args.options ?? {};
  const boundary = "zentry_" + Math.random().toString(36).slice(2);
  const snippet: Record<string, unknown> = {
    title: (args.title || "Untitled").slice(0, 100),
    description: args.description ?? "",
    categoryId: opts.categoryId ?? "22",
  };
  if (opts.tags && opts.tags.length > 0) snippet.tags = opts.tags;

  const status: Record<string, unknown> = {
    privacyStatus: opts.privacyStatus ?? "public",
    selfDeclaredMadeForKids: !!opts.madeForKids,
    license: opts.license ?? "youtube",
    embeddable: opts.embeddable ?? true,
    publicStatsViewable: opts.publicStatsViewable ?? true,
  };

  const body: Record<string, unknown> = { snippet, status };
  if (opts.locationDescription) {
    body.recordingDetails = { locationDescription: opts.locationDescription };
  }

  const metadata = JSON.stringify(body);

  const enc = new TextEncoder();
  const preamble = enc.encode(
    `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      metadata +
      `\r\n--${boundary}\r\n` +
      `Content-Type: ${args.videoMime}\r\n\r\n`,
  );
  const closer = enc.encode(`\r\n--${boundary}--\r\n`);
  const bodyBytes = new Uint8Array(
    preamble.byteLength + args.videoBytes.byteLength + closer.byteLength,
  );
  bodyBytes.set(preamble, 0);
  bodyBytes.set(new Uint8Array(args.videoBytes), preamble.byteLength);
  bodyBytes.set(closer, preamble.byteLength + args.videoBytes.byteLength);

  const parts = ["snippet", "status"];
  if (body.recordingDetails) parts.push("recordingDetails");
  const notify = opts.notifySubscribers === false ? "false" : "true";
  const url = `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=${parts.join(",")}&notifySubscribers=${notify}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: bodyBytes,
  });
  const json = await res.json();
  if (!res.ok || !json.id) {
    throw new Error(
      `YouTube upload failed (${res.status}): ${JSON.stringify(json).slice(0, 300)}`,
    );
  }
  return { videoId: json.id as string };
}

export async function addVideoToPlaylist(args: {
  accessToken: string;
  playlistId: string;
  videoId: string;
}): Promise<void> {
  const res = await fetch(
    "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        snippet: {
          playlistId: args.playlistId,
          resourceId: { kind: "youtube#video", videoId: args.videoId },
        },
      }),
    },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(
      `Adding to playlist ${args.playlistId} failed (${res.status}): ${t.slice(0, 200)}`,
    );
  }
}
