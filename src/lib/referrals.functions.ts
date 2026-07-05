import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyReferralInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Ensure code exists
    const { data: codeRow } = await supabaseAdmin.rpc("ensure_referral_code", {
      _user_id: context.userId,
    });
    const code = (codeRow as unknown as string) ?? "";

    // Fetch referrals I made
    const { data: refs } = await (supabaseAdmin as any)
      .from("referrals")
      .select("id, referee_id, credits_referrer, awarded_at, created_at")
      .eq("referrer_id", context.userId)
      .order("created_at", { ascending: false });

    const list = (refs ?? []) as Array<{
      id: string;
      referee_id: string;
      credits_referrer: number;
      awarded_at: string | null;
      created_at: string;
    }>;

    const totalInvites = list.length;
    const activated = list.filter((r) => r.awarded_at != null).length;
    const creditsEarned = list.reduce((n, r) => n + (r.credits_referrer ?? 0), 0);

    // My bonus credits
    const { data: profile } = await (supabaseAdmin as any)
      .from("profiles")
      .select("bonus_credits")
      .eq("id", context.userId)
      .maybeSingle();

    return {
      code,
      totalInvites,
      activated,
      creditsEarned,
      bonusCredits: (profile?.bonus_credits as number) ?? 0,
      recent: list.slice(0, 20),
    };
  });

export const recordReferralFromCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ code: z.string().trim().min(1).max(32) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result } = await supabaseAdmin.rpc("record_referral", {
      _referee: context.userId,
      _code: data.code.toUpperCase(),
    });
    return { linked: !!result };
  });

export const getReferrerByCode = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ code: z.string().trim().min(1).max(32) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await (supabaseAdmin as any).rpc("get_referrer_by_code", {
      _code: data.code.toUpperCase(),
    });
    const first = Array.isArray(rows) ? rows[0] : rows;
    const displayName = (first?.display_name as string | undefined) ?? null;
    return { displayName };
  });
