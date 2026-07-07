// Runs due scheduled_posts and publishes each pending target.
// Currently supports YouTube; TikTok/Instagram targets are left pending.
import { refreshYouTubeToken, publishYouTubeVideo, addVideoToPlaylist } from "@/lib/youtube.server";

const MAX_POSTS_PER_TICK = 5;

export async function runDueScheduledPosts(): Promise<{
  processed: number;
  published: number;
  failed: number;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const nowIso = new Date().toISOString();

  // Claim due posts atomically: queued + scheduled_for <= now -> publishing
  const { data: due, error } = await (supabaseAdmin as any)
    .from("scheduled_posts")
    .select("id, user_id, caption, video_path, scheduled_for, status")
    .in("status", ["queued"])
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true })
    .limit(MAX_POSTS_PER_TICK);
  if (error) throw new Error(error.message);
  if (!due || due.length === 0)
    return { processed: 0, published: 0, failed: 0 };

  let published = 0;
  let failed = 0;

  for (const post of due) {
    // Mark publishing
    await (supabaseAdmin as any)
      .from("scheduled_posts")
      .update({ status: "publishing" })
      .eq("id", post.id)
      .eq("status", "queued");

    const { data: targets } = await (supabaseAdmin as any)
      .from("scheduled_post_targets")
      .select("id, platform, social_account_id, status")
      .eq("scheduled_post_id", post.id)
      .eq("status", "pending");

    let anyFailed = false;
    let anyPublished = false;

    for (const t of targets ?? []) {
      try {
        if (t.platform !== "youtube") {
          // Not implemented yet — skip so it doesn't block the post.
          await (supabaseAdmin as any)
            .from("scheduled_post_targets")
            .update({ status: "skipped", error: "Auto-publish not yet enabled for this platform." })
            .eq("id", t.id);
          continue;
        }

        await (supabaseAdmin as any)
          .from("scheduled_post_targets")
          .update({ status: "publishing", error: null })
          .eq("id", t.id);

        const { data: acct } = await (supabaseAdmin as any)
          .from("social_accounts")
          .select("id, user_id, access_token, refresh_token, expires_at, revoked_at")
          .eq("id", t.social_account_id)
          .maybeSingle();
        if (!acct || acct.revoked_at)
          throw new Error("YouTube account not connected.");

        const accessToken = await refreshYouTubeToken(acct);

        // Signed URL to fetch the video bytes from private storage
        const { data: signed, error: signErr } = await (supabaseAdmin as any).storage
          .from("social-uploads")
          .createSignedUrl(post.video_path, 60 * 10);
        if (signErr || !signed?.signedUrl)
          throw new Error("Couldn't sign upload URL: " + (signErr?.message ?? "no url"));

        const videoRes = await fetch(signed.signedUrl);
        if (!videoRes.ok) throw new Error(`Fetch video failed (${videoRes.status})`);
        const videoBytes = await videoRes.arrayBuffer();
        const videoMime = videoRes.headers.get("content-type") ?? "video/mp4";

        const first = (post.caption ?? "").split("\n")[0]?.trim() || "New video";
        const title = first.length > 100 ? first.slice(0, 97) + "..." : first;

        const { videoId } = await publishYouTubeVideo({
          accessToken,
          title,
          description: post.caption ?? "",
          videoBytes,
          videoMime,
        });

        await (supabaseAdmin as any)
          .from("scheduled_post_targets")
          .update({
            status: "published",
            platform_post_id: videoId,
            published_at: new Date().toISOString(),
            error: null,
          })
          .eq("id", t.id);
        anyPublished = true;
      } catch (e: any) {
        anyFailed = true;
        await (supabaseAdmin as any)
          .from("scheduled_post_targets")
          .update({ status: "failed", error: String(e?.message ?? e).slice(0, 500) })
          .eq("id", t.id);
      }
    }

    // Reconcile parent status
    const finalStatus = anyFailed && !anyPublished ? "failed" : "published";
    if (anyPublished) published += 1;
    if (anyFailed && !anyPublished) failed += 1;
    await (supabaseAdmin as any)
      .from("scheduled_posts")
      .update({
        status: finalStatus,
        error: anyFailed && !anyPublished ? "One or more targets failed." : null,
      })
      .eq("id", post.id);
  }

  return { processed: due.length, published, failed };
}
