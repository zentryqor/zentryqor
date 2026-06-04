import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PrefsSchema = z.object({
  creator_type: z.enum([
    "video_editor",
    "designer",
    "content_creator",
    "freelancer",
    "entrepreneur",
    "photographer",
    "developer",
    "other",
  ]),
  niche: z.string().trim().min(1).max(80),
  interests: z.array(z.string().min(1).max(40)).min(1).max(12),
  platforms: z.array(z.string().min(1).max(40)).min(1).max(10),
  skill_level: z.enum(["beginner", "intermediate", "advanced", "pro"]),
  goals: z.array(z.string().min(1).max(60)).max(8).default([]),
  display_name: z.string().trim().min(1).max(60).optional(),
});

export const saveOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => PrefsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { error: pErr } = await supabase.from("creator_preferences").upsert({
      user_id: userId,
      creator_type: data.creator_type,
      niche: data.niche,
      interests: data.interests,
      platforms: data.platforms,
      skill_level: data.skill_level,
      goals: data.goals,
    });
    if (pErr) throw new Error(pErr.message);

    const { error: profErr } = await supabase
      .from("profiles")
      .update({
        onboarding_completed: true,
        ...(data.display_name ? { display_name: data.display_name } : {}),
      })
      .eq("id", userId);
    if (profErr) throw new Error(profErr.message);

    return { ok: true };
  });

export const getMyContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [profile, prefs, sub, activity] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("creator_preferences").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("vault_activity")
        .select("*")
        .eq("user_id", userId)
        .order("last_viewed_at", { ascending: false })
        .limit(8),
    ]);

    const isPremium = sub.data?.status === "active" || sub.data?.plan === "premium";

    return {
      profile: profile.data,
      preferences: prefs.data,
      subscription: sub.data,
      activity: activity.data ?? [],
      isPremium,
    };
  });

export const trackVaultView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        pack_slug: z.string().min(1).max(120),
        pack_title: z.string().min(1).max(200),
        pack_category: z.string().max(60).optional(),
        progress: z.number().min(0).max(1).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("vault_activity").upsert(
      {
        user_id: context.userId,
        pack_slug: data.pack_slug,
        pack_title: data.pack_title,
        pack_category: data.pack_category,
        progress: data.progress ?? 0,
        last_viewed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,pack_slug" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
