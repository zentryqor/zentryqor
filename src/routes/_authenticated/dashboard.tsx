import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Bookmark,
  Download,
  Flame,
  Lock,
  Sparkles,
  TrendingUp,
  Zap,
  Activity,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { getMyContext } from "@/lib/preferences.functions";
import { getDashboardStats } from "@/lib/stats.functions";
import { getAiCredits } from "@/lib/ai.functions";
import { getDashboardFeed } from "@/lib/assets.functions";
import { WorkspaceShell, StatCell, SectionLabel } from "@/components/WorkspaceShell";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Zentry Qor" }] }),
  component: Dashboard,
});

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const fetchCtx = useServerFn(getMyContext);
  const fetchStats = useServerFn(getDashboardStats);
  const fetchCredits = useServerFn(getAiCredits);
  const fetchFeed = useServerFn(getDashboardFeed);
  const { data: ctx, isLoading } = useQuery({ queryKey: ["me"], queryFn: () => fetchCtx() });
  const { data: stats } = useQuery({ queryKey: ["dashboard-stats"], queryFn: () => fetchStats() });
  const { data: credits } = useQuery({ queryKey: ["ai-credits"], queryFn: () => fetchCredits() });
  const { data: feed } = useQuery({ queryKey: ["dashboard-feed"], queryFn: () => fetchFeed() });

  const { isPastDue, isPremium: liveIsPremium } = useSubscription(user?.id);

  useEffect(() => {
    if (!isLoading && ctx && !ctx.profile?.onboarding_completed) {
      navigate({ to: "/onboarding" });
    }
  }, [ctx, isLoading, navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "success") return;
    toast.success("Welcome to Premium", {
      description: "Unlimited downloads and 1,000 AI credits per day are live.",
      duration: 6000,
    });
    let tries = 0;
    const poll = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      tries += 1;
      if (tries >= 6) clearInterval(poll);
    }, 1500);
    window.history.replaceState({}, "", window.location.pathname);
    return () => clearInterval(poll);
  }, [queryClient]);

  if (isLoading || !ctx) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-xs font-mono-display">
        loading workspace…
      </div>
    );
  }

  const { profile } = ctx;
  const isPremium = ctx.isPremium || liveIsPremium;
  const firstName = profile?.display_name?.split(" ")[0] ?? "creator";
  const today = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <WorkspaceShell
      path={["dashboard"]}
      isPremium={isPremium}
      meta={<span className="font-mono-display">{today.toLowerCase()}</span>}
      actions={
        <>
          {credits && (
            <Link
              to="/ai"
              className="hidden sm:flex items-center gap-1.5 h-8 px-2.5 rounded-md terminal-panel text-[11px] font-mono-display hover:bg-elevated/50 transition-colors"
            >
              <Zap className="h-3 w-3 text-accent" strokeWidth={2} />
              <span className="tabular-nums">{credits.remaining}</span>
              <span className="text-muted-foreground">/{credits.limit}</span>
            </Link>
          )}
          {!isPremium && (
            <Link
              to="/billing"
              className="h-8 px-3 rounded-md bg-accent text-accent-foreground text-[11px] font-mono-display font-medium flex items-center gap-1.5"
            >
              <Sparkles className="h-3 w-3" strokeWidth={2} /> upgrade
            </Link>
          )}
        </>
      }
    >
      <PaymentTestModeBanner />
      {isPastDue && (
        <div className="mb-4 hairline terminal-panel px-3 py-2 text-xs font-mono-display text-amber-300">
          [warning] last payment failed —{" "}
          <Link to="/billing" className="underline">update card</Link>
        </div>
      )}

      {/* Greeting */}
      <div className="mb-8">
        <div className="text-[11px] font-mono-display text-muted-foreground">
          &gt; whoami
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-mono-display tracking-tight">
          {firstName}
          <span className="text-muted-foreground">@zentryqor</span>
        </h1>
      </div>

      {/* Stats row — hairline cells, no cards */}
      <SectionLabel right="/ 7 days">metrics</SectionLabel>
      <div className="terminal-panel rounded-md grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border/50 mb-10">
        <StatCell
          label="downloads"
          value={isPremium ? (stats?.downloads ?? 0).toLocaleString() : (stats?.downloadsToday ?? 0)}
          unit={isPremium ? "total" : "/ 3 today"}
          delta={stats?.downloadsDelta}
        />
        <StatCell
          label="saved"
          value={stats?.saved ?? 0}
          delta={stats?.savedDelta}
        />
        <StatCell
          label="ai runs"
          value={stats?.aiRuns ?? 0}
          unit="/ 14d"
          delta={stats?.aiRunsDelta}
        />
        <StatCell
          label="streak"
          value={stats?.streak ?? 0}
          unit="days"
          hint={
            <span className="inline-flex items-center gap-1">
              <Flame className="h-3 w-3 text-accent" strokeWidth={2} />
              {(stats?.streak ?? 0) > 0 ? "keep it going" : "start today"}
            </span>
          }
        />
      </div>

      {/* Trending */}
      {feed?.trending && (
        <>
          <SectionLabel right={<Link to="/assets" className="hover:text-foreground">view all →</Link>}>
            trending
          </SectionLabel>
          <Link
            to="/assets/$id"
            params={{ id: feed.trending.id }}
            className="block terminal-panel rounded-md p-4 mb-10 hover:bg-elevated/40 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="h-16 w-24 sm:w-28 shrink-0 rounded-sm overflow-hidden terminal-panel-inset">
                {feed.trending.thumbnail_url ? (
                  <img src={feed.trending.thumbnail_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-lg font-mono-display text-foreground/30">
                    {feed.trending.title.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-mono-display uppercase tracking-[0.18em] text-accent flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3" strokeWidth={2} /> most downloaded
                </div>
                <div className="mt-1 text-base sm:text-lg font-medium truncate">{feed.trending.title}</div>
                <div className="text-[11px] text-muted-foreground font-mono-display capitalize mt-0.5">
                  {feed.trending.category}
                  {typeof feed.trending.download_count === "number" && feed.trending.download_count > 0
                    ? ` · ${feed.trending.download_count} dl`
                    : ""}
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" strokeWidth={1.75} />
            </div>
          </Link>
        </>
      )}

      {/* Recommended grid */}
      <SectionLabel
        right={
          feed?.total_assets ? (
            <Link to="/assets" className="hover:text-foreground font-mono-display">
              [{feed.total_assets}] browse all →
            </Link>
          ) : undefined
        }
      >
        picked for you
      </SectionLabel>
      {!feed ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-sm terminal-panel animate-pulse" />
          ))}
        </div>
      ) : feed.recommended.length === 0 ? (
        <div className="terminal-panel rounded-md p-10 text-center text-sm text-muted-foreground font-mono-display mb-10">
          no assets in vault yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-10">
          {feed.recommended.map((p) => {
            const locked = p.premium_only && !isPremium;
            return (
              <Link
                key={p.id}
                to="/assets/$id"
                params={{ id: p.id }}
                className="group terminal-panel rounded-sm overflow-hidden hover:border-accent/40 transition-colors"
              >
                <div className="relative aspect-[4/3] bg-elevated/30">
                  {p.thumbnail_url ? (
                    <img src={p.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-3xl font-mono-display text-foreground/25">
                      {p.title.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  {p.premium_only && (
                    <div className="absolute top-1.5 right-1.5 bg-background/80 backdrop-blur px-1.5 py-0.5 rounded-sm text-[9px] font-mono-display uppercase tracking-wider text-accent flex items-center gap-1">
                      {locked && <Lock className="h-2.5 w-2.5" strokeWidth={2} />} pro
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <div className="text-[9px] font-mono-display uppercase tracking-[0.18em] text-muted-foreground capitalize">
                    {p.category}
                  </div>
                  <div className="text-[12px] mt-0.5 truncate">{p.title}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Activity */}
      <SectionLabel>recent activity</SectionLabel>
      <div className="terminal-panel rounded-md mb-6">
        {!feed ? (
          <div className="p-6 text-xs text-muted-foreground font-mono-display">loading…</div>
        ) : feed.recent_activity.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground font-mono-display">
            <Activity className="h-5 w-5 mx-auto mb-2 opacity-40" strokeWidth={1.5} />
            no activity yet
          </div>
        ) : (
          <ul>
            {feed.recent_activity.map((item, i) => (
              <li key={i} className={i > 0 ? "hairline-t" : ""}>
                <Link
                  to="/assets/$id"
                  params={{ id: item.asset_id }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-elevated/30 transition-colors"
                >
                  <span className="text-[10px] font-mono-display text-muted-foreground w-16 shrink-0 tabular-nums">
                    {relativeTime(item.created_at)}
                  </span>
                  <span className={`text-[10px] font-mono-display uppercase tracking-wider w-14 shrink-0 ${
                    item.kind === "download" ? "text-accent" : "text-primary"
                  }`}>
                    {item.kind === "download" ? "[dl]" : "[save]"}
                  </span>
                  <span className="text-sm truncate flex-1">{item.asset_title}</span>
                  <span className="text-[10px] font-mono-display text-muted-foreground capitalize hidden sm:inline">
                    {item.asset_category}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Upgrade footer */}
      {!isPremium && (
        <div className="terminal-panel rounded-md p-5 sm:p-6 flex items-center justify-between gap-4 flex-wrap border-accent/30">
          <div className="min-w-0">
            <div className="text-[10px] font-mono-display uppercase tracking-[0.22em] text-accent">
              # premium
            </div>
            <div className="mt-1.5 text-base sm:text-lg font-medium">
              Unlimited downloads. 1,000 AI credits per day.
            </div>
            <div className="text-[11px] text-muted-foreground font-mono-display mt-1">
              $12.99/mo · cancel anytime
            </div>
          </div>
          <Link
            to="/billing"
            className="h-9 px-4 rounded-md bg-accent text-accent-foreground text-xs font-mono-display font-medium flex items-center gap-1.5 shrink-0"
          >
            upgrade <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
          </Link>
        </div>
      )}
    </WorkspaceShell>
  );
}
