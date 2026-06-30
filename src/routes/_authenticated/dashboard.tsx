import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import {
  ArrowUpRight,
  Bookmark,
  Calendar,
  Download,
  FileText,
  Flame,
  Hash,
  Image as ImageIcon,
  Lock,
  LogOut,
  Megaphone,
  Quote,
  Sparkles,
  TrendingUp,
  Video,
  Wand2,
  Zap,
  Bot,
  Package,
  Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/preferences.functions";
import { getDashboardStats } from "@/lib/stats.functions";
import { getAiCredits } from "@/lib/ai.functions";
import { getDashboardFeed, getSavedAssets } from "@/lib/assets.functions";
import { PremiumBadge } from "@/components/PremiumLock";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { AppHeader, AppHeaderLink } from "@/components/AppHeader";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronRight, Settings } from "lucide-react";
import { ProfileMenu } from "@/components/ProfileMenu";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Zentry Qor" }] }),
  component: Dashboard,
});

// Real AI tools (must match TOOLS in /ai page). Deep-links via ?tool=<id>.
const AI_TOOLS = [
  { id: "hook", name: "Hook Generator", icon: Zap, accent: "text-yellow-400", premium: false },
  { id: "caption", name: "Caption Studio", icon: Quote, accent: "text-pink-400", premium: false },
  { id: "video-idea", name: "Video Ideas", icon: Video, accent: "text-blue-400", premium: false },
  { id: "script", name: "Script Assistant", icon: FileText, accent: "text-cyan-400", premium: true },
  { id: "thumbnail", name: "Thumbnail Image", icon: ImageIcon, accent: "text-emerald-400", premium: true },
  { id: "trend", name: "Trend Finder", icon: TrendingUp, accent: "text-rose-400", premium: false },
  { id: "hashtag", name: "Hashtags", icon: Hash, accent: "text-teal-400", premium: false },
  { id: "planner", name: "7-day Planner", icon: Calendar, accent: "text-violet-400", premium: true },
  { id: "bio", name: "Brand Bio", icon: Megaphone, accent: "text-orange-400", premium: false },
] as const;

const GRADIENTS = [
  "from-primary/40 to-accent/20",
  "from-accent/40 to-primary/20",
  "from-primary/30 to-foreground/5",
  "from-accent/30 to-primary/10",
  "from-foreground/10 to-primary/20",
  "from-primary/20 to-accent/30",
];

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
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
  const [activeTab, setActiveTab] = useState<"overview" | "browse" | "ai" | "activity">("overview");

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
      description: "Unlimited downloads and 1,000 AI credits per day are live on your account.",
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
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm">
        Loading your workspace…
      </div>
    );
  }

  const { profile, preferences } = ctx;
  const isPremium = ctx.isPremium || liveIsPremium;
  const firstName = profile?.display_name?.split(" ")[0] ?? "creator";

  const subline = (() => {
    if (preferences?.platforms?.length) {
      return `For ${preferences.platforms.join(" · ")}`;
    }
    return "";
  })();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <AnimatedOrbs />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
        aria-hidden
      />
      <div className="relative">
      <PaymentTestModeBanner />
      {isPastDue && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-center text-xs text-amber-200">
          ⚠ Your last payment failed.{" "}
          <Link to="/billing" className="underline font-medium">
            Update your card
          </Link>{" "}
          to keep Premium access.
        </div>
      )}
      <AppHeader
        nav={
          <>
            <AppHeaderLink to="/dashboard" active>Dashboard</AppHeaderLink>
            <AppHeaderLink to="/assets">Vault</AppHeaderLink>
            <SavedNavDropdown />
            <AppHeaderLink to="/ai">AI Studio</AppHeaderLink>
          </>
        }
        right={
          <>
            {!isPremium && (
              <Link to="/billing" className="hidden sm:inline-flex h-8 sm:h-9 px-3 rounded-full glass items-center gap-1.5 text-xs font-medium">
                <Sparkles className="h-3 w-3 text-accent icon-fx" /> Upgrade
              </Link>
            )}
            <ProfileMenu />
          </>
        }
      />

      <main className="max-w-7xl mx-auto px-6 pt-28 pb-32">
        {/* Greeting */}
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em]">
              Welcome back, <span className="text-gradient-brand">{firstName}</span>.
            </h1>
            {subline && (
              <p className="text-sm text-muted-foreground mt-2">{subline}</p>
            )}
          </div>
          {isPremium ? (
            <PremiumBadge />
          ) : (
            <Link to="/billing" className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-medium glow-primary magnetic flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 icon-fx" /> Upgrade to Premium
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 inline-flex gap-1 p-1 rounded-full glass-strong">
          {(["overview", "browse", "ai", "activity"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 h-8 text-xs rounded-full capitalize transition-colors ${
                activeTab === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-6 gap-4"
            >
              {/* Stats */}
              <BentoCard className="md:col-span-3">
                <CardHeader icon={<Download className="h-4 w-4" />} title="Downloads" />
                <div className="mt-3 flex items-end justify-between">
                  <div className="text-4xl font-semibold tracking-tight text-gradient-brand">
                    {isPremium ? (stats?.downloads ?? 0).toLocaleString() : `${stats?.downloadsToday ?? 0}/3`}
                  </div>
                  <Sparkline data={stats?.sparkline} className="text-accent" />
                </div>
                <DeltaLabel value={stats?.downloadsDelta} />
                {!isPremium && (
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Free plan · 3 downloads per day
                  </div>
                )}
              </BentoCard>

              <Link to="/saved" className="md:col-span-3 group">
                <BentoCard className="h-full transition-colors group-hover:bg-elevated/40">
                  <CardHeader icon={<Bookmark className="h-4 w-4" />} title="Saved" />
                  <div className="mt-3 text-4xl font-semibold tracking-tight">{stats?.saved ?? 0}</div>
                  <DeltaLabel value={stats?.savedDelta} />
                </BentoCard>
              </Link>

              <Link to="/ai" className="md:col-span-3 group">
                <BentoCard className="h-full transition-colors group-hover:bg-elevated/40">
                  <CardHeader icon={<Bot className="h-4 w-4" />} title="AI runs (14d)" />
                  <div className="mt-3 text-4xl font-semibold tracking-tight">{stats?.aiRuns ?? 0}</div>
                  <DeltaLabel value={stats?.aiRunsDelta} />
                </BentoCard>
              </Link>

              <BentoCard className="md:col-span-3">
                <CardHeader icon={<Flame className="h-4 w-4" />} title="Active streak" />
                <div className="mt-3 flex items-end gap-2">
                  <div className="text-4xl font-semibold tracking-tight">{stats?.streak ?? 0}d</div>
                  <div className="text-2xl pb-1">🔥</div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {(stats?.streak ?? 0) > 0
                    ? "Download, save, or generate to extend your streak"
                    : "Take any action today to start a streak"}
                </div>
              </BentoCard>

              {/* Trending — real top asset */}
              {feed?.trending && (
                <Link
                  to="/assets/$id"
                  params={{ id: feed.trending.id }}
                  className="md:col-span-6 group"
                >
                  <BentoCard className="relative overflow-hidden hover:bg-elevated/40 transition-colors">
                    <div className="absolute -top-24 -right-16 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
                    <div className="flex items-center justify-between flex-wrap gap-4 relative">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 flex items-center gap-2">
                          <TrendingUp className="h-3 w-3 text-accent" /> Most downloaded right now
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em]">{feed.trending.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 capitalize">
                          {feed.trending.category}
                          {typeof feed.trending.download_count === "number" && feed.trending.download_count > 0
                            ? ` · ${feed.trending.download_count} downloads`
                            : ""}
                        </p>
                      </div>
                      <div className="h-20 w-32 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 ring-1 ring-border overflow-hidden shrink-0">
                        {feed.trending.thumbnail_url && (
                          <img src={feed.trending.thumbnail_url} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                    </div>
                  </BentoCard>
                </Link>
              )}

              {/* Recommended — real assets ranked by user prefs */}
              <BentoCard className="md:col-span-6">
                <div className="flex items-center justify-between">
                  <CardHeader icon={<Sparkles className="h-4 w-4 icon-fx" />} title={interestsLabel(preferences?.interests)} />
                  <Link to="/assets" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    Browse all {feed?.total_assets ? `(${feed.total_assets})` : ""} <ArrowUpRight className="h-3 w-3 icon-fx" />
                  </Link>
                </div>
                {!feed ? (
                  <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="aspect-[4/3] rounded-2xl bg-elevated/40 animate-pulse" />
                    ))}
                  </div>
                ) : feed.recommended.length === 0 ? (
                  <div className="mt-6 text-center py-10 text-sm text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-3 opacity-40" />
                    No assets in the vault yet.{" "}
                    <Link to="/admin" className="text-accent underline">Add your first one</Link>.
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {feed.recommended.map((p, i) => {
                      const locked = p.premium_only && !isPremium;
                      const grad = GRADIENTS[i % GRADIENTS.length];
                      return (
                        <Link
                          key={p.id}
                          to="/assets/$id"
                          params={{ id: p.id }}
                          className="group text-left relative"
                        >
                          <div className={`relative aspect-[4/3] rounded-2xl bg-gradient-to-br ${grad} overflow-hidden ring-1 ring-border`}>
                            {p.thumbnail_url ? (
                              <img src={p.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-4xl font-semibold text-foreground/30">
                                {p.title.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            {p.premium_only && (
                              <div className="absolute top-2 right-2 glass-strong rounded-full px-2 py-0.5 text-[10px] flex items-center gap-1">
                                {locked && <Lock className="h-2.5 w-2.5 icon-fx" />} Premium
                              </div>
                            )}
                            {locked && (
                              <div className="absolute inset-0 bg-background/40 backdrop-blur-sm flex items-center justify-center">
                                <Lock className="h-4 w-4 text-foreground/80 icon-fx" />
                              </div>
                            )}
                          </div>
                          <div className="mt-2.5">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground capitalize">{p.category}</div>
                            <div className="text-sm font-medium mt-0.5 line-clamp-1">{p.title}</div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </BentoCard>

              {!isPremium && (
                <BentoCard className="md:col-span-6 relative overflow-hidden">
                  <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-primary/30 blur-3xl" />
                  <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-accent/20 blur-3xl" />
                  <div className="relative flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-accent flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 icon-fx" /> Premium
                      </div>
                      <h3 className="text-2xl font-semibold tracking-[-0.02em] mt-2">
                        Unlimited downloads + 1,000 AI credits per day.
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        $12.99/month. Cancel from Billing in one click.
                      </p>
                    </div>
                    <Link to="/billing" className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-xl bg-foreground text-background text-sm font-medium magnetic glow-primary hover:opacity-90 transition-opacity">
                      Upgrade now
                      <ArrowUpRight className="h-3.5 w-3.5 icon-fx" />
                    </Link>
                  </div>
                </BentoCard>
              )}
            </motion.div>
          )}

          {activeTab === "browse" && (
            <motion.div
              key="browse"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-6 gap-4"
            >
              <BentoCard className="md:col-span-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <CardHeader icon={<Package className="h-4 w-4" />} title="Browse by category" />
                  <Link to="/assets" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    Open full vault <ArrowUpRight className="h-3 w-3 icon-fx" />
                  </Link>
                </div>
                {!feed || feed.categories.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-6 text-center">
                    No categories yet — assets will appear here once added to the vault.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {feed.categories.map((c, i) => (
                      <Link
                        key={c}
                        to="/assets"
                        className={`group relative aspect-[4/3] rounded-2xl bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} overflow-hidden ring-1 ring-border p-4 flex flex-col justify-end`}
                      >
                        <div className="absolute inset-0 ring-grid opacity-30" />
                        <div className="relative">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Category</div>
                          <div className="text-base font-semibold capitalize mt-1">{c}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </BentoCard>
            </motion.div>
          )}

          {activeTab === "ai" && (
            <motion.div
              key="ai"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-6 gap-4"
            >
              <BentoCard className="md:col-span-4">
                <CardHeader icon={<Wand2 className="h-4 w-4" />} title="AI Studio" />
                <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                  Tap a tool to jump straight into it. Each generation deducts credits — text tools cost {credits?.costs.text ?? 10}, thumbnails cost {credits?.costs.image ?? 30}.
                </p>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AI_TOOLS.map((t) => {
                    const Icon = t.icon;
                    const locked = t.premium && !isPremium;
                    return (
                      <Link
                        key={t.id}
                        to="/ai"
                        search={{ tool: t.id }}
                        className="relative p-3 rounded-xl glass hover:bg-elevated transition-colors text-left"
                      >
                        <Icon className={`h-4 w-4 ${t.accent}`} />
                        <div className="text-sm font-medium mt-2 line-clamp-1">{t.name}</div>
                        {locked && (
                          <Lock className="absolute top-2 right-2 h-3 w-3 text-muted-foreground" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </BentoCard>

              <BentoCard className="md:col-span-2">
                <CardHeader icon={<Sparkles className="h-4 w-4" />} title="Credits today" />
                <div className="mt-3 text-4xl font-semibold tracking-tight">
                  {credits ? credits.remaining : "—"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  of {credits?.limit ?? "—"} {isPremium ? "(Premium)" : "(Free)"}
                </div>
                <div className="mt-4 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent"
                    style={{
                      width: credits
                        ? `${Math.max(2, Math.min(100, (credits.remaining / credits.limit) * 100))}%`
                        : "0%",
                    }}
                  />
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">Resets at midnight UTC</div>
              </BentoCard>
            </motion.div>
          )}

          {activeTab === "activity" && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-6 gap-4"
            >
              <BentoCard className="md:col-span-6">
                <CardHeader icon={<Activity className="h-4 w-4" />} title="Recent activity" />
                {!feed ? (
                  <div className="mt-4 space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-14 rounded-xl bg-elevated/40 animate-pulse" />
                    ))}
                  </div>
                ) : feed.recent_activity.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    <Activity className="h-8 w-8 mx-auto mb-3 opacity-40" />
                    <p>Nothing yet.</p>
                    <p className="text-xs mt-1">
                      Downloads and saves from the{" "}
                      <Link to="/assets" className="text-accent underline">vault</Link> will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    {feed.recent_activity.map((item, i) => (
                      <Link
                        key={i}
                        to="/assets/$id"
                        params={{ id: item.asset_id }}
                        className="flex items-center justify-between p-3 rounded-xl bg-elevated/40 hover:bg-elevated/60 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                            item.kind === "download" ? "bg-primary/10" : "bg-accent/10"
                          }`}>
                            {item.kind === "download" ? (
                              <Download className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <Bookmark className="h-3.5 w-3.5 text-accent" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{item.asset_title}</div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {item.kind === "download" ? "Downloaded" : "Saved"} · {item.asset_category}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {relativeTime(item.created_at)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </BentoCard>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      </div>
    </div>
  );
}

function interestsLabel(interests?: string[]) {
  if (!interests || interests.length === 0) return "Picked for you";
  return `Picked for you · ${interests.slice(0, 2).join(", ")}`;
}

function BentoCard({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`glass rounded-3xl p-6 ${className}`}>{children}</div>;
}

function CardHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
      <span className="text-accent">{icon}</span> {title}
    </div>
  );
}

function Sparkline({ className = "", data }: { className?: string; data?: number[] }) {
  const values = data && data.length > 0 ? data : [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(...values, 1);
  const w = 80;
  const h = 28;
  const stepX = values.length > 1 ? w / (values.length - 1) : w;
  const points = values
    .map((v, i) => `${(i * stepX).toFixed(1)},${(h - (v / max) * (h - 4) - 2).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`h-7 w-20 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points={points} />
    </svg>
  );
}

function DeltaLabel({ value }: { value?: number }) {
  if (value === undefined) return <div className="text-xs text-muted-foreground mt-1">—</div>;
  if (value === 0) return <div className="text-xs text-muted-foreground mt-1">No change this week</div>;
  const positive = value > 0;
  return (
    <div className={`text-xs mt-1 ${positive ? "text-emerald-400" : "text-muted-foreground"}`}>
      {positive ? "+" : ""}
      {value}% vs last week
    </div>
  );
}

function SavedNavDropdown() {
  const fetchSaved = useServerFn(getSavedAssets);
  const { data: saved = [], isLoading } = useQuery({
    queryKey: ["saved-assets"],
    queryFn: () => fetchSaved(),
  });
  const preview = saved.slice(0, 5);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors text-sm inline-flex items-center gap-1">
          Saved
          <ChevronRight className="h-3 w-3 rotate-90" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[320px] p-2 rounded-2xl border-border/60 bg-card/95 backdrop-blur-xl"
      >
        <div className="px-2 pt-1 pb-2 flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Saved</span>
          <span className="text-[11px] text-muted-foreground">{saved.length} total</span>
        </div>

        {isLoading ? (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">Loading…</div>
        ) : preview.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            Nothing saved yet — tap the bookmark on any asset.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {preview.map((a) => (
              <Link
                key={a.id}
                to="/assets/$id"
                params={{ id: a.id }}
                className="flex items-center gap-3 rounded-xl p-2 hover:bg-elevated/60 transition"
              >
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/40 to-accent/20 ring-1 ring-border flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-foreground/60">
                    {a.title.slice(0, 1).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{a.title}</div>
                  <div className="text-[11px] text-muted-foreground capitalize truncate">
                    {a.category}
                  </div>
                </div>
                <Bookmark className="h-3.5 w-3.5 text-accent shrink-0" />
              </Link>
            ))}
          </div>
        )}

        <Link
          to="/saved"
          className="mt-2 flex items-center justify-between rounded-xl px-3 py-2.5 text-sm bg-elevated/60 hover:bg-elevated transition"
        >
          <span className="font-medium">View all saved</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>
      </PopoverContent>
    </Popover>
  );
}
