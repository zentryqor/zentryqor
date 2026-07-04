import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BatchJob = {
  id: string;
  name: string;
  kind: "text" | "image";
  status: "queued" | "running" | "completed" | "failed" | "canceled";
  total: number;
  completed: number;
  failed: number;
  aspect_ratio: string | null;
  system_prompt: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type BatchItem = {
  id: string;
  batch_id: string;
  position: number;
  prompt: string;
  status: "pending" | "running" | "done" | "failed" | "skipped";
  output_text: string | null;
  output_image: string | null;
  credits_cost: number | null;
  generation_id: string | null;
  error: string | null;
  created_at: string;
};

export type ScheduledJob = {
  id: string;
  name: string;
  kind: "text" | "image";
  prompts: string[];
  system_prompt: string | null;
  aspect_ratio: string | null;
  cadence: "hourly" | "daily" | "weekly";
  hour_utc: number;
  weekday: number | null;
  active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
};

// ---------- Batches ----------

export const listBatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("batch_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as BatchJob[];
  });

export const getBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: job } = await (context.supabase as any)
      .from("batch_jobs").select("*").eq("id", data.id).maybeSingle();
    if (!job) return null;
    const { data: items } = await (context.supabase as any)
      .from("batch_items").select("*").eq("batch_id", data.id).order("position", { ascending: true });
    return { job: job as BatchJob, items: (items ?? []) as BatchItem[] };
  });

export const createBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      name: z.string().trim().min(1).max(80),
      kind: z.enum(["text", "image"]),
      prompts: z.array(z.string().trim().min(1).max(2000)).min(1).max(50),
      systemPrompt: z.string().max(2000).optional(),
      aspectRatio: z.enum(["16:9", "9:16", "4:3", "3:4"]).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: job, error } = await (context.supabase as any)
      .from("batch_jobs")
      .insert({
        user_id: context.userId,
        name: data.name,
        kind: data.kind,
        total: data.prompts.length,
        system_prompt: data.systemPrompt ?? null,
        aspect_ratio: data.aspectRatio ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const rows = data.prompts.map((p, i) => ({
      batch_id: job.id,
      user_id: context.userId,
      position: i,
      prompt: p,
    }));
    const { error: err2 } = await (context.supabase as any).from("batch_items").insert(rows);
    if (err2) throw new Error(err2.message);
    // Kick off first tick asynchronously — no await, safe fire-and-forget
    const { processBatchTick } = await import("@/lib/batch.server");
    processBatchTick(job.id, 3).catch(() => {});
    return { id: job.id as string };
  });

export const tickBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    // Ownership check via RLS-safe query
    const { data: row } = await (context.supabase as any)
      .from("batch_jobs").select("id").eq("id", data.id).maybeSingle();
    if (!row) throw new Error("Not found");
    const { processBatchTick } = await import("@/lib/batch.server");
    return processBatchTick(data.id, 3);
  });

export const cancelBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("batch_jobs")
      .update({ status: "canceled" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await (context.supabase as any)
      .from("batch_items")
      .update({ status: "skipped" })
      .eq("batch_id", data.id)
      .eq("status", "pending");
    return { ok: true };
  });

export const deleteBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("batch_jobs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Scheduled jobs ----------

async function isPremium(context: any): Promise<boolean> {
  const { data } = await (context.supabase as any).rpc("is_premium", { _user_id: context.userId });
  return !!data;
}

export const listScheduled = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("scheduled_jobs").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ScheduledJob[];
  });

export const createScheduled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      name: z.string().trim().min(1).max(80),
      kind: z.enum(["text", "image"]),
      prompts: z.array(z.string().trim().min(1).max(2000)).min(1).max(20),
      systemPrompt: z.string().max(2000).optional(),
      aspectRatio: z.enum(["16:9", "9:16", "4:3", "3:4"]).optional(),
      cadence: z.enum(["hourly", "daily", "weekly"]),
      hourUtc: z.number().int().min(0).max(23).default(9),
      weekday: z.number().int().min(0).max(6).nullable().optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    if (!(await isPremium(context))) {
      throw new Error("Scheduled jobs are a Premium feature. Upgrade to unlock.");
    }
    const { computeNextRun } = await import("@/lib/batch.server");
    const next = computeNextRun(data.cadence, data.hourUtc, data.weekday ?? null);
    const { data: row, error } = await (context.supabase as any)
      .from("scheduled_jobs")
      .insert({
        user_id: context.userId,
        name: data.name,
        kind: data.kind,
        prompts: data.prompts,
        system_prompt: data.systemPrompt ?? null,
        aspect_ratio: data.aspectRatio ?? null,
        cadence: data.cadence,
        hour_utc: data.hourUtc,
        weekday: data.weekday ?? null,
        next_run_at: next,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string, nextRunAt: next };
  });

export const toggleScheduled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("scheduled_jobs").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteScheduled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("scheduled_jobs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
