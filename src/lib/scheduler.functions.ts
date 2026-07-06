import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ScheduledPostRow = {
  id: string;
  caption: string;
  video_path: string | null;
  scheduled_for: string;
  status: string;
  error: string | null;
  created_at: string;
  targets: {
    id: string;
    platform: "youtube";
    status: string;
    error: string | null;
    platform_post_id: string | null;
    published_at: string | null;
  }[];
};

export const listScheduledPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("scheduled_posts")
      .select(
        "id, caption, video_path, scheduled_for, status, error, created_at, scheduled_post_targets(id, platform, status, error, platform_post_id, published_at)",
      )
      .order("scheduled_for", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      ...r,
      targets: r.scheduled_post_targets ?? [],
    })) as ScheduledPostRow[];
  });

export const createSignedUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        filename: z.string().min(1).max(200),
        contentType: z.string().min(1).max(120),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    if (!/^video\//.test(data.contentType))
      throw new Error("Only video files are allowed.");
    const safeName = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${context.userId}/${Date.now()}-${safeName}`;
    const { data: signed, error } = await (context.supabase as any).storage
      .from("social-uploads")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

export const createScheduledPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        caption: z.string().max(5000).default(""),
        videoPath: z.string().min(3),
        scheduledFor: z.string().min(10),
        platforms: z
          .array(z.enum(["youtube"]))
          .min(1),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const when = new Date(data.scheduledFor);
    if (isNaN(when.getTime())) throw new Error("Invalid scheduled time");
    if (when.getTime() < Date.now() - 60_000)
      throw new Error("Scheduled time must be in the future");

    // Look up connected accounts for the requested platforms
    const { data: accts, error: acctErr } = await (context.supabase as any)
      .from("social_accounts_public")
      .select("id, platform, revoked_at")
      .in("platform", data.platforms)
      .is("revoked_at", null);
    if (acctErr) throw new Error(acctErr.message);
    const byPlatform = new Map<string, string>();
    for (const a of accts ?? []) if (!byPlatform.has(a.platform)) byPlatform.set(a.platform, a.id);
    for (const p of data.platforms) {
      if (!byPlatform.has(p)) throw new Error(`Connect ${p} first`);
    }

    const { data: post, error: pErr } = await (context.supabase as any)
      .from("scheduled_posts")
      .insert({
        user_id: context.userId,
        caption: data.caption,
        video_path: data.videoPath,
        scheduled_for: when.toISOString(),
        status: "queued",
      })
      .select("id")
      .single();
    if (pErr) throw new Error(pErr.message);

    const targets = data.platforms.map((p) => ({
      scheduled_post_id: post.id,
      user_id: context.userId,
      platform: p,
      social_account_id: byPlatform.get(p)!,
      status: "pending" as const,
    }));
    const { error: tErr } = await (context.supabase as any)
      .from("scheduled_post_targets")
      .insert(targets);
    if (tErr) throw new Error(tErr.message);

    return { id: post.id };
  });

export const cancelScheduledPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("scheduled_posts")
      .update({ status: "canceled" })
      .eq("id", data.id)
      .in("status", ["queued", "draft"]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteScheduledPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("scheduled_posts")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
