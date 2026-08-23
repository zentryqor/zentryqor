import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAppwriteAuth } from "@/integrations/appwrite/auth-middleware";

const cadenceSchema = z.object({
  type: z.enum(["daily", "every_n_days", "weekdays", "custom_days"]),
  intervalDays: z.number().int().min(1).max(30).default(1),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/), // "HH:MM" (user local)
  startDate: z.string().min(8), // YYYY-MM-DD (user local)
  tzOffsetMinutes: z.number().int().min(-14 * 60).max(14 * 60), // browser offset
});

const ytOptionsSchema = z
  .object({
    privacyStatus: z.enum(["public", "unlisted", "private"]).default("public"),
    madeForKids: z.boolean().default(false),
    categoryId: z.string().max(10).optional(),
    tags: z.array(z.string().max(50)).max(50).optional(),
    notifySubscribers: z.boolean().default(true),
  })
  .partial()
  .default({});

const clipSchema = z.object({
  videoPath: z.string().min(3),
  title: z.string().max(100).optional(),
  caption: z.string().max(5000).default(""),
});

/**
 * Turn cadence + startDate/timeOfDay into a list of ISO datetimes (UTC),
 * one per clip. All math is done as if the user is in the browser tz they
 * sent via `tzOffsetMinutes`.
 */
function computeSlots(
  cadence: z.infer<typeof cadenceSchema>,
  count: number,
): Date[] {
  const [hh, mm] = cadence.timeOfDay.split(":").map(Number);
  const [y, mo, d] = cadence.startDate.split("-").map(Number);
  // Interpret start as local wall-clock in the user tz.
  // Local time -> UTC: add tz offset (Date.getTimezoneOffset semantics: local = UTC + offset;
  // browsers send `-new Date().getTimezoneOffset()`, i.e. "east-positive"). We use that convention.
  const toUtc = (year: number, month0: number, day: number) => {
    const localMinutesFromUtc = cadence.tzOffsetMinutes;
    const utcMs =
      Date.UTC(year, month0, day, hh, mm) - localMinutesFromUtc * 60_000;
    return new Date(utcMs);
  };

  const slots: Date[] = [];
  const cursor = new Date(Date.UTC(y, mo - 1, d));
  let safety = 0;
  const wanted = (n: number) => {
    if (cadence.type === "daily") return true;
    if (cadence.type === "every_n_days") {
      return n % cadence.intervalDays === 0;
    }
    // JS getUTCDay: 0=Sun..6=Sat. Our "weekdays" mode is Mon-Fri (1..5).
    const utcDay = cursor.getUTCDay();
    if (cadence.type === "weekdays") return utcDay >= 1 && utcDay <= 5;
    return cadence.weekdays.includes(utcDay);
  };

  let step = 0;
  while (slots.length < count && safety++ < 3650) {
    if (wanted(step)) {
      slots.push(
        toUtc(
          cursor.getUTCFullYear(),
          cursor.getUTCMonth(),
          cursor.getUTCDate(),
        ),
      );
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    step++;
  }
  return slots;
}

export const createPostSeries = createServerFn({ method: "POST" })
  .middleware([requireAppwriteAuth])
  .inputValidator((i) =>
    z
      .object({
        name: z.string().min(1).max(120),
        cadence: cadenceSchema,
        youtube: ytOptionsSchema,
        clips: z.array(clipSchema).min(1).max(200),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const slots = computeSlots(data.cadence, data.clips.length);
    if (slots.length !== data.clips.length)
      throw new Error("Couldn't compute schedule slots");

    // Require an active YouTube account.
    const { data: accts, error: acctErr } = await (context.supabase as any)
      .from("social_accounts_public")
      .select("id, platform, revoked_at")
      .eq("platform", "youtube")
      .is("revoked_at", null);
    if (acctErr) throw new Error(acctErr.message);
    const ytId = (accts ?? [])[0]?.id;
    if (!ytId) throw new Error("Connect YouTube first");

    const { data: series, error: sErr } = await (context.supabase as any)
      .from("post_series")
      .insert({
        user_id: context.userId,
        name: data.name,
        cadence: data.cadence,
        youtube_options: data.youtube,
        clip_count: data.clips.length,
      })
      .select("id")
      .single();
    if (sErr) throw new Error(sErr.message);

    const postRows = data.clips.map((c, i) => ({
      user_id: context.userId,
      caption: c.caption,
      video_path: c.videoPath,
      scheduled_for: slots[i].toISOString(),
      status: "queued" as const,
      series_id: series.id,
      series_position: i + 1,
      options: {
        youtube: {
          ...data.youtube,
          title: c.title || undefined,
          description: c.caption || undefined,
        },
      },
    }));

    const { data: inserted, error: pErr } = await (context.supabase as any)
      .from("scheduled_posts")
      .insert(postRows)
      .select("id");
    if (pErr) throw new Error(pErr.message);

    const targets = (inserted ?? []).map((p: any) => ({
      scheduled_post_id: p.id,
      user_id: context.userId,
      platform: "youtube" as const,
      social_account_id: ytId,
      status: "pending" as const,
    }));
    if (targets.length > 0) {
      const { error: tErr } = await (context.supabase as any)
        .from("scheduled_post_targets")
        .insert(targets);
      if (tErr) throw new Error(tErr.message);
    }

    return { id: series.id as string, scheduled: postRows.length };
  });

export type PostSeriesRow = {
  id: string;
  name: string;
  clip_count: number;
  created_at: string;
  cadence: any;
  counts: { queued: number; published: number; failed: number; total: number };
  nextRun: string | null;
};

export const listPostSeries = createServerFn({ method: "GET" })
  .middleware([requireAppwriteAuth])
  .handler(async ({ context }): Promise<PostSeriesRow[]> => {
    const { data: series, error } = await (context.supabase as any)
      .from("post_series")
      .select("id, name, clip_count, created_at, cadence")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    if (!series?.length) return [];

    const ids = series.map((s: any) => s.id);
    const { data: posts } = await (context.supabase as any)
      .from("scheduled_posts")
      .select("series_id, status, scheduled_for")
      .in("series_id", ids);

    const byId = new Map<string, PostSeriesRow>();
    for (const s of series) {
      byId.set(s.id, {
        id: s.id,
        name: s.name,
        clip_count: s.clip_count,
        created_at: s.created_at,
        cadence: s.cadence,
        counts: { queued: 0, published: 0, failed: 0, total: 0 },
        nextRun: null,
      });
    }
    for (const p of posts ?? []) {
      const row = byId.get(p.series_id);
      if (!row) continue;
      row.counts.total++;
      if (p.status === "queued") row.counts.queued++;
      if (p.status === "published") row.counts.published++;
      if (p.status === "failed") row.counts.failed++;
      if (
        p.status === "queued" &&
        (!row.nextRun || p.scheduled_for < row.nextRun)
      ) {
        row.nextRun = p.scheduled_for;
      }
    }
    return series.map((s: any) => byId.get(s.id)!);
  });

export const deletePostSeries = createServerFn({ method: "POST" })
  .middleware([requireAppwriteAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    // Cancel any queued posts belonging to this series, then delete the series.
    await (context.supabase as any)
      .from("scheduled_posts")
      .update({ status: "canceled" })
      .eq("series_id", data.id)
      .eq("status", "queued");
    const { error } = await (context.supabase as any)
      .from("post_series")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
