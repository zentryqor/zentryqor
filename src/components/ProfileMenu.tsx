import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, FolderHeart, Gift, Key, Layers, LogOut, Settings, Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/preferences.functions";
import { getDashboardStats } from "@/lib/stats.functions";
import { getAiCredits } from "@/lib/ai.functions";

export function ProfileMenu() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium: liveIsPremium } = useSubscription(user?.id);
  const fetchCtx = useServerFn(getMyContext);
  const fetchStats = useServerFn(getDashboardStats);
  const fetchCredits = useServerFn(getAiCredits);
  const { data: ctx } = useQuery({ queryKey: ["me"], queryFn: () => fetchCtx() });
  const { data: stats } = useQuery({ queryKey: ["dashboard-stats"], queryFn: () => fetchStats() });
  const { data: credits } = useQuery({ queryKey: ["ai-credits"], queryFn: () => fetchCredits() });

  const profile = ctx?.profile;
  const isPremium = (ctx?.isPremium ?? false) || liveIsPremium;
  const firstName = profile?.display_name?.split(" ")[0] ?? "creator";

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Account"
          className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-semibold text-primary-foreground ring-0 hover:ring-2 hover:ring-primary/40 transition"
        >
          {firstName[0]?.toUpperCase()}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[320px] p-3 rounded-2xl glass-strong bg-background/40 shadow-2xl shadow-black/30"
      >
        <div className="px-2 pt-1 pb-3 border-b border-white/10 mb-3">
          <div className="text-sm font-semibold truncate">{profile?.display_name ?? firstName}</div>
          <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
        </div>

        <Link
          to="/ai"
          className="block rounded-xl p-3 glass hover:bg-white/[0.06] transition mb-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">AI credits</span>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              {credits ? `${credits.remaining} of ${credits.limit}` : "—"}
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent"
              style={{
                width: credits
                  ? `${Math.max(2, Math.min(100, (credits.remaining / credits.limit) * 100))}%`
                  : "0%",
              }}
            />
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
            Resets at midnight UTC
          </div>
        </Link>

        <Link
          to="/saved"
          className="block rounded-xl p-3 glass hover:bg-white/[0.06] transition mb-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Downloads</span>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              {stats?.downloads ?? 0} total
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {isPremium
              ? "Unlimited downloads on Premium"
              : `${stats?.downloadsToday ?? 0} of 3 used today`}
          </div>
        </Link>

        {!isPremium && (
          <Link
            to="/billing"
            className="block rounded-xl p-3 bg-gradient-to-r from-primary/15 to-accent/15 hover:from-primary/25 hover:to-accent/25 transition mb-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-accent" /> Upgrade to Premium
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </Link>
        )}

        <Link
          to="/library"
          className="w-full rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition flex items-center gap-2"
        >
          <FolderHeart className="h-3.5 w-3.5" /> My library
        </Link>
        <Link
          to="/batch"
          className="w-full rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition flex items-center gap-2"
        >
          <Layers className="h-3.5 w-3.5" /> Batch & schedule
        </Link>
        <Link
          to="/api-keys"
          className="w-full rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition flex items-center gap-2"
        >
          <Key className="h-3.5 w-3.5" /> API keys
        </Link>

        <Link
          to="/refer"
          className="w-full rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition flex items-center gap-2"
        >
          <Gift className="h-3.5 w-3.5" /> Refer & earn
        </Link>
        <Link
          to="/settings"
          className="w-full rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition flex items-center gap-2"
        >
          <Settings className="h-3.5 w-3.5" /> Settings
        </Link>
        <button
          onClick={signOut}
          className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition flex items-center gap-2"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </PopoverContent>
    </Popover>
  );
}
