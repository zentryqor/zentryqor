import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAppwriteAuth } from "@/integrations/appwrite/auth-middleware";

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
  .middleware([requireAppwriteAuth])
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
  .middleware([requireAppwriteAuth])
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

const youtubeOptionsSchema = z
  .object({
    title: z.string().max(100).optional(),
    description: z.string().max(5000).optional(),
    privacyStatus: z.enum(["public", "unlisted", "private"]).default("public"),
    madeForKids: z.boolean().default(false),
    categoryId: z.string().max(10).optional(),
    tags: z.array(z.string().max(50)).max(50).optional(),
    license: z.enum(["youtube", "creativeCommon"]).default("youtube"),
    embeddable: z.boolean().default(true),
    publicStatsViewable: z.boolean().default(true),
    notifySubscribers: z.boolean().default(true),
    playlistIds: z.array(z.string().max(64)).max(20).optional(),
    locationDescription: z.string().max(120).optional(),
  })
  .partial()
  .optional();

export const createScheduledPost = createServerFn({ method: "POST" })
  .middleware([requireAppwriteAuth])
  .inputValidator((i) =>
    z
      .object({
        id: z.string().uuid().optional(),
        caption: z.string().max(5000).default(""),
        videoPath: z.string().min(3),
        scheduledFor: z.string().min(10),
        platforms: z.array(z.enum(["youtube"])).min(1),
        youtube: youtubeOptionsSchema,
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const when = new Date(data.scheduledFor);
    if (isNaN(when.getTime())) throw new Error("Invalid scheduled time");
    if (when.getTime() < Date.now() - 60_000)
      throw new Error("Scheduled time must be in the future");

    const { data: accts, error: acctErr } = await (context.supabase as any)
      .from("social_accounts_public")
      .select("id, platform, revoked_at")
      .in("platform", data.platforms)
      .is("revoked_at", null);
    if (acctErr) throw new Error(acctErr.message);
    const byPlatform = new Map<string, string>();
    for (const a of accts ?? [])
      if (!byPlatform.has(a.platform)) byPlatform.set(a.platform, a.id);
    for (const p of data.platforms) {
      if (!byPlatform.has(p)) throw new Error(`Connect ${p} first`);
    }

    let postId = data.id;
    if (postId) {
      const { error: uErr } = await (context.supabase as any)
        .from("scheduled_posts")
        .update({
          caption: data.caption,
          video_path: data.videoPath,
          scheduled_for: when.toISOString(),
          status: "queued",
          error: null,
          options: { youtube: data.youtube ?? {} },
        })
        .eq("id", postId)
        .eq("user_id", context.userId)
        .in("status", ["draft", "queued", "failed", "canceled"]);
      if (uErr) throw new Error(uErr.message);
      await (context.supabase as any)
        .from("scheduled_post_targets")
        .delete()
        .eq("scheduled_post_id", postId);
    } else {
      const { data: post, error: pErr } = await (context.supabase as any)
        .from("scheduled_posts")
        .insert({
          user_id: context.userId,
          caption: data.caption,
          video_path: data.videoPath,
          scheduled_for: when.toISOString(),
          status: "queued",
          options: { youtube: data.youtube ?? {} },
        })
        .select("id")
        .single();
      if (pErr) throw new Error(pErr.message);
      postId = post.id;
    }

    const targets = data.platforms.map((p) => ({
      scheduled_post_id: postId!,
      user_id: context.userId,
      platform: p,
      social_account_id: byPlatform.get(p)!,
      status: "pending" as const,
    }));
    const { error: tErr } = await (context.supabase as any)
      .from("scheduled_post_targets")
      .insert(targets);
    if (tErr) throw new Error(tErr.message);

    return { id: postId! };
  });

export const saveDraftPost = createServerFn({ method: "POST" })
  .middleware([requireAppwriteAuth])
  .inputValidator((i) =>
    z
      .object({
        id: z.string().uuid().optional(),
        caption: z.string().max(5000).default(""),
        videoPath: z.string().min(3).nullable().optional(),
        scheduledFor: z.string().min(10).optional(),
        platforms: z.array(z.enum(["youtube"])).min(1).default(["youtube"]),
        youtube: youtubeOptionsSchema,
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    // Drafts may skip a real scheduled time; default to +1h so the NOT NULL
    // column stays valid until the user picks a final time.
    const whenIso = data.scheduledFor
      ? new Date(data.scheduledFor).toISOString()
      : new Date(Date.now() + 60 * 60_000).toISOString();

    const payload = {
      user_id: context.userId,
      caption: data.caption,
      video_path: data.videoPath ?? null,
      scheduled_for: whenIso,
      status: "draft" as const,
      error: null,
      options: { youtube: data.youtube ?? {} },
    };

    let postId = data.id;
    if (postId) {
      const { error: uErr } = await (context.supabase as any)
        .from("scheduled_posts")
        .update(payload)
        .eq("id", postId)
        .eq("user_id", context.userId);
      if (uErr) throw new Error(uErr.message);
    } else {
      const { data: post, error: pErr } = await (context.supabase as any)
        .from("scheduled_posts")
        .insert(payload)
        .select("id")
        .single();
      if (pErr) throw new Error(pErr.message);
      postId = post.id;
    }

    await (context.supabase as any)
      .from("scheduled_post_targets")
      .delete()
      .eq("scheduled_post_id", postId);

    const { data: accts } = await (context.supabase as any)
      .from("social_accounts_public")
      .select("id, platform, revoked_at")
      .in("platform", data.platforms)
      .is("revoked_at", null);
    const byPlatform = new Map<string, string>();
    for (const a of accts ?? [])
      if (!byPlatform.has(a.platform)) byPlatform.set(a.platform, a.id);

    const targets = data.platforms
      .filter((p) => byPlatform.has(p))
      .map((p) => ({
        scheduled_post_id: postId!,
        user_id: context.userId,
        platform: p,
        social_account_id: byPlatform.get(p)!,
        status: "pending" as const,
      }));
    if (targets.length > 0) {
      const { error: tErr } = await (context.supabase as any)
        .from("scheduled_post_targets")
        .insert(targets);
      if (tErr) throw new Error(tErr.message);
    }

    return { id: postId! };
  });

export const getScheduledPost = createServerFn({ method: "GET" })
  .middleware([requireAppwriteAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("scheduled_posts")
      .select(
        "id, caption, video_path, scheduled_for, status, options, scheduled_post_targets(platform)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Draft not found");
    return {
      id: row.id as string,
      caption: (row.caption ?? "") as string,
      video_path: (row.video_path ?? null) as string | null,
      scheduled_for: row.scheduled_for as string,
      status: row.status as string,
      options: (row.options ?? {}) as { youtube?: any },
      platforms: (
        (row.scheduled_post_targets ?? []) as { platform: string }[]
      ).map((t) => t.platform),
    };
  });

export const cancelScheduledPost = createServerFn({ method: "POST" })
  .middleware([requireAppwriteAuth])
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
  .middleware([requireAppwriteAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("scheduled_posts")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
