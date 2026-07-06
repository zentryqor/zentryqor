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

export async function refreshYouTubeToken(row: Row): Promise<string> {
  // If the token still has > 60s left, keep it.
  if (
    row.expires_at &&
    new Date(row.expires_at).getTime() - Date.now() > 60_000
  ) {
    return row.access_token;
  }
  if (!row.refresh_token) {
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
  const expires_at = json.expires_in
    ? new Date(Date.now() + json.expires_in * 1000).toISOString()
    : null;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await (supabaseAdmin as any)
    .from("social_accounts")
    .update({ access_token: json.access_token, expires_at })
    .eq("id", row.id);

  return json.access_token as string;
}

export async function publishYouTubeVideo(args: {
  accessToken: string;
  title: string;
  description: string;
  videoBytes: ArrayBuffer;
  videoMime: string;
  privacyStatus?: "public" | "unlisted" | "private";
}): Promise<{ videoId: string }> {
  const boundary = "zentry_" + Math.random().toString(36).slice(2);
  const metadata = JSON.stringify({
    snippet: {
      title: (args.title || "Untitled").slice(0, 100),
      description: args.description ?? "",
      categoryId: "22", // People & Blogs
    },
    status: {
      privacyStatus: args.privacyStatus ?? "public",
      selfDeclaredMadeForKids: false,
    },
  });

  const enc = new TextEncoder();
  const preamble = enc.encode(
    `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      metadata +
      `\r\n--${boundary}\r\n` +
      `Content-Type: ${args.videoMime}\r\n\r\n`,
  );
  const closer = enc.encode(`\r\n--${boundary}--\r\n`);
  const body = new Uint8Array(
    preamble.byteLength + args.videoBytes.byteLength + closer.byteLength,
  );
  body.set(preamble, 0);
  body.set(new Uint8Array(args.videoBytes), preamble.byteLength);
  body.set(closer, preamble.byteLength + args.videoBytes.byteLength);

  const res = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  const json = await res.json();
  if (!res.ok || !json.id) {
    throw new Error(
      `YouTube upload failed (${res.status}): ${JSON.stringify(json).slice(0, 300)}`,
    );
  }
  return { videoId: json.id as string };
}
