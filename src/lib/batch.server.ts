// Server-only worker for batch + scheduled generation.
// Called from server functions (user-triggered ticks) and the /api/public/hooks
// scheduled-jobs endpoint (pg_cron). Never import from client modules.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateGoogleImageDataUrl } from "@/lib/google-image.server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const FREE_DAILY_CREDITS = 150;
const PREMIUM_DAILY_CREDITS = 1000;
const TEXT_COST = 10;
const IMAGE_COST = 30;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

async function userIsPremium(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return false;
  const now = Date.now();
  const periodEnd = data.current_period_end ? new Date(data.current_period_end).getTime() : null;
  if (["active", "trialing", "past_due"].includes(data.status) && (!periodEnd || periodEnd > now)) return true;
  if (data.status === "canceled" && periodEnd && periodEnd > now) return true;
  return false;
}

async function spendCredits(userId: string, cost: number) {
  const isPremium = await userIsPremium(userId);
  const limit = isPremium ? PREMIUM_DAILY_CREDITS : FREE_DAILY_CREDITS;
  const day = todayUtc();
  const { data } = await supabaseAdmin
    .from("ai_credit_usage")
    .select("id, used")
    .eq("user_id", userId)
    .eq("day", day)
    .maybeSingle();
  const { data: profile } = await (supabaseAdmin as any)
    .from("profiles")
    .select("bonus_credits")
    .eq("id", userId)
    .maybeSingle();
  const used = data?.used ?? 0;
  const bonus: number = profile?.bonus_credits ?? 0;
  const dailyRemaining = Math.max(0, limit - used);
  const total = dailyRemaining + bonus;
  if (total < cost) {
    throw new Error(`Not enough credits (need ${cost}, have ${total}).`);
  }
  const dailyRoom = Math.max(0, limit - used);
  const fromDaily = Math.min(dailyRoom, cost);
  const fromBonus = cost - fromDaily;
  if (fromDaily > 0) {
    if (data?.id) {
      await supabaseAdmin
        .from("ai_credit_usage")
        .update({ used: used + fromDaily, updated_at: new Date().toISOString() })
        .eq("id", data.id);
    } else {
      await supabaseAdmin
        .from("ai_credit_usage")
        .insert({ user_id: userId, day, used: fromDaily });
    }
  }
  if (fromBonus > 0) {
    await supabaseAdmin.rpc("consume_bonus_credits" as any, { _user_id: userId, _amount: fromBonus });
  }
}

async function refundCredits(userId: string, amount: number) {
  const day = todayUtc();
  const { data } = await supabaseAdmin
    .from("ai_credit_usage")
    .select("id, used")
    .eq("user_id", userId)
    .eq("day", day)
    .maybeSingle();
  if (data?.id) {
    await supabaseAdmin
      .from("ai_credit_usage")
      .update({ used: Math.max(0, (data.used ?? 0) - amount) })
      .eq("id", data.id);
  }
}

async function runText(prompt: string, system?: string | null): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY missing");
  const messages = [
    ...(system ? [{ role: "system", content: system }] : []),
    { role: "user", content: prompt },
  ];
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://zentryqor.lovable.app",
      "X-Title": "Zentry Qor",
    },
    body: JSON.stringify({ model: "openai/gpt-oss-120b:free", messages }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

async function runImage(prompt: string, aspect: string): Promise<string> {
  const aspectRatio = (["16:9", "9:16", "4:3", "3:4"].includes(aspect) ? aspect : "16:9");
  return generateGoogleImageDataUrl({ prompt, aspectRatio: aspectRatio as "16:9" | "9:16" | "4:3" | "3:4" });
}

/**
 * Process up to N pending items from a batch. Runs sequentially to control cost.
 * Safe to call repeatedly; uses row status transitions to avoid double-processing.
 */
export async function processBatchTick(batchId: string, maxItems = 3): Promise<{ processed: number; done: boolean }> {
  const { data: batch } = await (supabaseAdmin as any)
    .from("batch_jobs")
    .select("*")
    .eq("id", batchId)
    .maybeSingle();
  if (!batch) return { processed: 0, done: true };
  if (batch.status === "canceled" || batch.status === "completed" || batch.status === "failed") {
    return { processed: 0, done: true };
  }

  if (batch.status === "queued") {
    await (supabaseAdmin as any)
      .from("batch_jobs")
      .update({ status: "running" })
      .eq("id", batchId);
  }

  const { data: pending } = await (supabaseAdmin as any)
    .from("batch_items")
    .select("*")
    .eq("batch_id", batchId)
    .eq("status", "pending")
    .order("position", { ascending: true })
    .limit(maxItems);

  let processed = 0;
  let successes = 0;
  let failures = 0;
  const cost = batch.kind === "image" ? IMAGE_COST : TEXT_COST;

  for (const item of pending ?? []) {
    await (supabaseAdmin as any)
      .from("batch_items")
      .update({ status: "running" })
      .eq("id", item.id);
    try {
      await spendCredits(batch.user_id, cost);
      let outputText: string | null = null;
      let outputImage: string | null = null;
      if (batch.kind === "text") {
        outputText = await runText(item.prompt, batch.system_prompt);
      } else {
        outputImage = await runImage(item.prompt, batch.aspect_ratio ?? "16:9");
      }
      // Auto-save into library
      const { data: gen } = await (supabaseAdmin as any)
        .from("generations")
        .insert({
          user_id: batch.user_id,
          tool_id: batch.kind === "image" ? "batch-image" : "batch-text",
          tool_name: `Batch: ${batch.name}`,
          kind: batch.kind,
          prompt: item.prompt,
          system_prompt: batch.system_prompt,
          input: item.prompt,
          output_text: outputText,
          output_image: outputImage,
          aspect_ratio: batch.aspect_ratio,
          credits_cost: cost,
        })
        .select("id")
        .single();

      await (supabaseAdmin as any)
        .from("batch_items")
        .update({
          status: "done",
          output_text: outputText,
          output_image: outputImage,
          credits_cost: cost,
          generation_id: gen?.id ?? null,
        })
        .eq("id", item.id);
      successes++;
      await (supabaseAdmin as any)
        .from("batch_jobs")
        .update({ completed: (batch.completed ?? 0) + successes })
        .eq("id", batchId);
    } catch (e: any) {
      await refundCredits(batch.user_id, cost).catch(() => {});
      await (supabaseAdmin as any)
        .from("batch_items")
        .update({ status: "failed", error: String(e?.message ?? e).slice(0, 500) })
        .eq("id", item.id);
      failures++;
      await (supabaseAdmin as any)
        .from("batch_jobs")
        .update({ failed: (batch.failed ?? 0) + failures })
        .eq("id", batchId);
    }
    processed++;
  }

  // Recheck if done
  const { count: leftover } = await (supabaseAdmin as any)
    .from("batch_items")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId)
    .eq("status", "pending");

  if (!leftover || leftover === 0) {
    const { data: totals } = await (supabaseAdmin as any)
      .from("batch_items")
      .select("status")
      .eq("batch_id", batchId);
    const failedAll = (totals ?? []).every((t: any) => t.status === "failed");
    await (supabaseAdmin as any)
      .from("batch_jobs")
      .update({ status: failedAll ? "failed" : "completed" })
      .eq("id", batchId);
    return { processed, done: true };
  }

  return { processed, done: false };
}

/**
 * Find and execute all scheduled jobs whose next_run_at is due.
 * Creates a batch_job + items per scheduled_job, then kicks a first tick.
 */
export async function runDueScheduledJobs(): Promise<{ triggered: number }> {
  const nowIso = new Date().toISOString();
  const { data: due } = await (supabaseAdmin as any)
    .from("scheduled_jobs")
    .select("*")
    .eq("active", true)
    .or(`next_run_at.is.null,next_run_at.lte.${nowIso}`)
    .limit(20);

  let triggered = 0;
  for (const job of due ?? []) {
    const prompts: string[] = Array.isArray(job.prompts) ? job.prompts : [];
    if (prompts.length === 0) {
      await advanceNextRun(job);
      continue;
    }
    const { data: batch } = await (supabaseAdmin as any)
      .from("batch_jobs")
      .insert({
        user_id: job.user_id,
        name: `${job.name} — ${new Date().toISOString().slice(0, 10)}`,
        kind: job.kind,
        aspect_ratio: job.aspect_ratio,
        system_prompt: job.system_prompt,
        total: prompts.length,
        status: "queued",
      })
      .select("id")
      .single();

    if (batch?.id) {
      const rows = prompts.map((p, i) => ({
        batch_id: batch.id,
        user_id: job.user_id,
        position: i,
        prompt: p,
      }));
      await (supabaseAdmin as any).from("batch_items").insert(rows);
      // Fire one tick synchronously (cheap since we cap items)
      await processBatchTick(batch.id, 3).catch(() => {});
      triggered++;
    }
    await advanceNextRun(job);
  }
  return { triggered };
}

async function advanceNextRun(job: any) {
  const next = computeNextRun(job.cadence, job.hour_utc, job.weekday);
  await (supabaseAdmin as any)
    .from("scheduled_jobs")
    .update({ last_run_at: new Date().toISOString(), next_run_at: next })
    .eq("id", job.id);
}

export function computeNextRun(cadence: string, hourUtc: number, weekday: number | null): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUtc, 0, 0));
  if (cadence === "hourly") {
    const nxt = new Date(now.getTime() + 60 * 60 * 1000);
    nxt.setUTCMinutes(0, 0, 0);
    return nxt.toISOString();
  }
  if (cadence === "weekly" && weekday !== null && weekday !== undefined) {
    const cur = d.getUTCDay();
    let diff = weekday - cur;
    if (diff < 0 || (diff === 0 && d.getTime() <= now.getTime())) diff += 7;
    d.setUTCDate(d.getUTCDate() + diff);
    return d.toISOString();
  }
  // daily
  if (d.getTime() <= now.getTime()) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}
