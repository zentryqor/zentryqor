import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAppwriteAuth } from "@/integrations/appwrite/auth-middleware";
import {
  DEFAULT_PUSH_PREFERENCES,
  PUSH_CATEGORY_KEYS,
  type PushConfig,
  type PushPreferences,
} from "./push-categories";

/** Publishable Firebase web config (safe for the browser). */
export const getPushConfig = createServerFn({ method: "GET" }).handler(async (): Promise<PushConfig> => {
  const cfg = {
    apiKey: process.env.FIREBASE_API_KEY ?? "",
    projectId: process.env.FIREBASE_PROJECT_ID ?? "",
    appId: process.env.FIREBASE_APP_ID ?? "",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID ?? "",
    vapidKey: process.env.FIREBASE_VAPID_PUBLIC_KEY ?? "",
  };
  return { ...cfg, configured: Object.values(cfg).every((v) => v.length > 0) };
});

/** Registers (or refreshes) this device's FCM token and ensures a preferences row. */
export const registerPushDevice = createServerFn({ method: "POST" })
  .middleware([requireAppwriteAuth])
  .inputValidator((input: { token: string; platform?: string; userAgent?: string }) =>
    z
      .object({
        token: z.string().min(20).max(4096),
        platform: z.string().max(40).optional(),
        userAgent: z.string().max(400).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { error } = await supabase.from("push_devices").upsert(
      {
        user_id: userId,
        token: data.token,
        platform: data.platform ?? null,
        user_agent: data.userAgent ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );
    if (error) throw new Error(error.message);

    await supabase.from("push_preferences").upsert({ user_id: userId }, { onConflict: "user_id" });

    return { ok: true };
  });

/** Removes a device token (used when the user turns notifications off). */
export const unregisterPushDevice = createServerFn({ method: "POST" })
  .middleware([requireAppwriteAuth])
  .inputValidator((input: { token: string }) =>
    z.object({ token: z.string().min(20).max(4096) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("push_devices")
      .delete()
      .eq("user_id", context.userId)
      .eq("token", data.token);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getPushSettings = createServerFn({ method: "GET" })
  .middleware([requireAppwriteAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: prefs }, { data: devices }] = await Promise.all([
      supabase.from("push_preferences").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("push_devices")
        .select("id, token, platform, user_agent, last_seen_at")
        .eq("user_id", userId)
        .order("last_seen_at", { ascending: false }),
    ]);

    const merged: PushPreferences = { ...DEFAULT_PUSH_PREFERENCES };
    if (prefs) {
      for (const key of PUSH_CATEGORY_KEYS) {
        merged[key] = Boolean((prefs as Record<string, unknown>)[key]);
      }
      merged.quiet_hours_start = prefs.quiet_hours_start ?? null;
      merged.quiet_hours_end = prefs.quiet_hours_end ?? null;
    }

    return {
      preferences: merged,
      hasRow: Boolean(prefs),
      devices: (devices ?? []).map((d) => ({
        id: d.id,
        platform: d.platform,
        userAgent: d.user_agent,
        lastSeenAt: d.last_seen_at,
        tokenTail: d.token.slice(-8),
      })),
    };
  });

const prefsSchema = z.object({
  new_assets: z.boolean().optional(),
  ai_ready: z.boolean().optional(),
  scheduled_posts: z.boolean().optional(),
  credits: z.boolean().optional(),
  referrals: z.boolean().optional(),
  billing: z.boolean().optional(),
  product_updates: z.boolean().optional(),
  quiet_hours_start: z.number().int().min(0).max(23).nullable().optional(),
  quiet_hours_end: z.number().int().min(0).max(23).nullable().optional(),
});

export const updatePushPreferences = createServerFn({ method: "POST" })
  .middleware([requireAppwriteAuth])
  .inputValidator((input: z.infer<typeof prefsSchema>) => prefsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("push_preferences")
      .upsert({ user_id: context.userId, ...data }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePushDevice = createServerFn({ method: "POST" })
  .middleware([requireAppwriteAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("push_devices")
      .delete()
      .eq("user_id", context.userId)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Sends a test notification to every device registered by the caller. */
export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireAppwriteAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: devices } = await supabase
      .from("push_devices")
      .select("token")
      .eq("user_id", userId);

    const tokens = (devices ?? []).map((d) => d.token);
    if (!tokens.length) return { sent: 0, message: "No devices registered on this account yet." };

    const { sendPushToTokens } = await import("./push.server");
    const { sent, invalidTokens } = await sendPushToTokens(tokens, {
      title: "Zentry Qor",
      body: "Push notifications are live on this device. 🎉",
      category: "product_updates",
      url: "/settings",
    });

    if (invalidTokens.length) {
      await supabase.from("push_devices").delete().in("token", invalidTokens).eq("user_id", userId);
    }

    return { sent, message: sent ? `Sent to ${sent} device(s).` : "Couldn't reach your devices." };
  });
