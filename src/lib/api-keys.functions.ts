import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const KEY_PREFIX = "zqk_live_";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

function generateRawKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return KEY_PREFIX + bytesToHex(bytes);
}

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("api_keys")
      .select("id, name, key_prefix, last_used_at, revoked_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listApiUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("api_usage_logs")
      .select("id, endpoint, method, status, credits_cost, latency_ms, error_message, api_key_id, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    // 30-day series for charts
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { data: recent30 } = await context.supabase
      .from("api_usage_logs")
      .select("status, credits_cost, endpoint, created_at")
      .gte("created_at", since30.toISOString())
      .order("created_at", { ascending: true });
    const all30 = recent30 ?? [];

    // Build 30 daily buckets
    const days: { date: string; requests: number; credits: number }[] = [];
    const byDay: Record<string, { requests: number; credits: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      byDay[key] = { requests: 0, credits: 0 };
      days.push({ date: key, requests: 0, credits: 0 });
    }
    for (const r of all30) {
      const key = new Date(r.created_at).toISOString().slice(0, 10);
      if (byDay[key]) {
        byDay[key].requests += 1;
        byDay[key].credits += r.credits_cost ?? 0;
      }
    }
    const series = days.map((d) => ({ ...byDay[d.date], date: d.date }));

    // Endpoint breakdown (30d)
    const byEndpoint: Record<string, { requests: number; credits: number }> = {};
    for (const r of all30) {
      const k = r.endpoint || "unknown";
      if (!byEndpoint[k]) byEndpoint[k] = { requests: 0, credits: 0 };
      byEndpoint[k].requests += 1;
      byEndpoint[k].credits += r.credits_cost ?? 0;
    }
    const breakdown = Object.entries(byEndpoint)
      .map(([endpoint, v]) => ({ endpoint, ...v }))
      .sort((a, b) => b.requests - a.requests);

    // 7-day stats
    const since7 = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const rows7 = all30.filter((r) => new Date(r.created_at).getTime() >= since7);
    const total = rows7.length;
    const success = rows7.filter((r) => r.status >= 200 && r.status < 300).length;
    const errors = total - success;
    const creditsSpent = rows7.reduce((n, r) => n + (r.credits_cost ?? 0), 0);

    // Month-to-date projection
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const daysElapsed = Math.max(
      1,
      Math.floor((Date.now() - startOfMonth.getTime()) / (24 * 60 * 60 * 1000)),
    );
    const daysInMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate();
    const mtdCredits = all30
      .filter((r) => new Date(r.created_at).getTime() >= startOfMonth.getTime())
      .reduce((n, r) => n + (r.credits_cost ?? 0), 0);
    const projectedMonth = Math.round((mtdCredits / daysElapsed) * daysInMonth);

    return {
      recent: data ?? [],
      stats: { total, success, errors, creditsSpent },
      series,
      breakdown,
      projection: { mtdCredits, projectedMonth, daysElapsed, daysInMonth },
    };
  });

export const getRateLimitStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: premium } = await supabaseAdmin.rpc("is_premium", { _user_id: context.userId });

    // Tier definitions (also used to enforce limits at request time)
    const tier = premium
      ? { name: "Premium", perMinute: 120, perDay: 10000, burst: 20, dailyCredits: 1000 }
      : { name: "Free", perMinute: 0, perDay: 0, burst: 0, dailyCredits: 0 };

    // Current window usage from api_usage_logs
    const minuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count: lastMinute } = await context.supabase
      .from("api_usage_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", minuteAgo);
    const { count: lastDay } = await context.supabase
      .from("api_usage_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", dayAgo);

    return {
      tier,
      usage: {
        lastMinute: lastMinute ?? 0,
        lastDay: lastDay ?? 0,
      },
      resetMinuteAt: new Date(Date.now() + 60 * 1000).toISOString(),
      resetDayAt: new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString(),
    };
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ name: z.string().trim().min(1).max(60) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: premium } = await supabaseAdmin.rpc("is_premium", {
      _user_id: context.userId,
    });
    if (!premium) {
      throw new Error("Premium membership required to create API keys.");
    }

    const { count } = await context.supabase
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .is("revoked_at", null);
    if ((count ?? 0) >= 10) {
      throw new Error("You've reached the maximum of 10 active API keys. Revoke one first.");
    }

    const rawKey = generateRawKey();
    const keyHash = await sha256Hex(rawKey);
    const keyPrefix = rawKey.slice(0, KEY_PREFIX.length + 6);

    const { data: inserted, error } = await context.supabase
      .from("api_keys")
      .insert({
        user_id: context.userId,
        name: data.name,
        key_prefix: keyPrefix,
        key_hash: keyHash,
      })
      .select("id, name, key_prefix, created_at")
      .single();
    if (error) throw new Error(error.message);

    return { key: rawKey, record: inserted };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .is("revoked_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
