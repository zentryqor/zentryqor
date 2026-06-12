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
  Download,
  Flame,
  Lock,
  LogOut,
  Play,
  Sparkles,
  Wand2,
  Zap,
  Bot,
  Package,
  Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext, trackVaultView } from "@/lib/preferences.functions";
import { getDashboardStats } from "@/lib/stats.functions";
import { getAiCredits } from "@/lib/ai.functions";
import { PremiumBadge, PremiumLockOverlay } from "@/components/PremiumLock";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { AppHeader, AppHeaderLink } from "@/components/AppHeader";
import { WorkspaceDock } from "@/components/WorkspaceDock";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronRight, Settings } from "lucide-react";



export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Zentry Qor" }] }),
  component: Dashboard,
});

const ALL_PACKS = [
  { slug: "cinematic-reels", title: "Cinematic Reels", tag: "Editing", premium: false, grad: "from-primary/40 to-accent/20" },
  { slug: "viral-hooks-2026", title: "Viral Hooks 2026", tag: "Captions", premium: false, grad: "from-accent/40 to-primary/20" },
  { slug: "brand-identity", title: "Brand Identity Kit", tag: "Design", premium: true, grad: "from-primary/30 to-foreground/5" },
  { slug: "motion-overlays-pro", title: "Motion Overlays Pro", tag: "Motion", premium: true, grad: "from-accent/30 to-primary/10" },
  { slug: "thumbnail-lab", title: "Thumbnail Lab", tag: "YouTube", premium: false, grad: "from-foreground/10 to-primary/20" },
  { slug: "notion-creator-os", title: "Notion for Creators", tag: "Productivity", premium: true, grad: "from-primary/20 to-accent/30" },
];

const AI_TOOLS = [
  { name: "Hook Generator", icon: Wand2, premium: false },
  { name: "Caption Studio", icon: Sparkles, premium: false },
  { name: "Thumbnail AI", icon: Zap, premium: true },
  { name: "Script Architect", icon: Flame, premium: true },
];

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const fetchCtx = useServerFn(getMyContext);
  const fetchStats = useServerFn(getDashboardStats);
  const fetchCredits = useServerFn(getAiCredits);
  const track = useServerFn(trackVaultView);
  const { data: ctx, isLoading } = useQuery({ queryKey: ["me"], queryFn: () => fetchCtx() });
  const { data: stats } = useQuery({ queryKey: ["dashboard-stats"], queryFn: () => fetchStats() });
  const { data: credits } = useQuery({ queryKey: ["ai-credits"], queryFn: () => fetchCredits() });
  const [activeTab] = useState<"overview" | "assets" | "ai" | "activity">("overview");

  const { isPastDue, isPremium: liveIsPremium } = useSubscription(user?.id);

  useEffect(() => {
    if (!isLoading && ctx && !ctx.profile?.onboarding_completed) {
      navigate({ to: "/onboarding" });
    }
  }, [ctx, isLoading, navigate]);

  // Checkout success celebration — poll briefly for the webhook to update the row
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "success") return;

    toast.success("🎉 Welcome to Premium", {
      description: "Everything is unlocked. Enjoy the vault.",
      duration: 6000,
    });

    let tries = 0;
    const poll = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      tries += 1;
      if (tries >= 6) clearInterval(poll);
    }, 1500);

    // Clean the URL
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

  const { profile, preferences, activity } = ctx;
  const isPremium = ctx.isPremium || liveIsPremium;
  const firstName = profile?.display_name?.split(" ")[0] ?? "creator";

  // Personalize: filter recommendations by interests/platforms
  const interests = preferences?.interests ?? [];
  const recommended = ALL_PACKS
    .map((p) => ({
      ...p,
      score:
        (interests.includes(p.tag) ? 2 : 0) +
        (interests.some((i) => p.title.toLowerCase().includes(i.toLowerCase())) ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  

  async function openPack(p: typeof ALL_PACKS[number]) {
    if (p.premium && !isPremium) return;
    await track({ data: { pack_slug: p.slug, pack_title: p.title, pack_category: p.tag, progress: 0.1 } }).catch(() => {});
  }

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
            <AppHeaderLink to="/assets">Assets</AppHeaderLink>
            <AppHeaderLink to="/saved">Saved</AppHeaderLink>
            <AppHeaderLink to="/admin">Admin</AppHeaderLink>
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
                className="w-[320px] p-3 rounded-2xl border-border/60 bg-card/95 backdrop-blur-xl"
              >
                <div className="px-2 pt-1 pb-3 border-b border-border/50 mb-3">
                  <div className="text-sm font-semibold truncate">{profile?.display_name ?? firstName}</div>
                  <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                </div>

                <Link
                  to="/ai"
                  className="block rounded-xl p-3 bg-elevated/60 hover:bg-elevated transition mb-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Credits</span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      {credits ? `${credits.remaining} left` : "—"}
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
                    Daily credits reset at midnight UTC
                  </div>
                </Link>

                <Link
                  to="/saved"
                  className="block rounded-xl p-3 bg-elevated/60 hover:bg-elevated transition mb-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Asset downloads</span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      {stats?.downloads ?? 0} total
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {isPremium
                      ? "Unlimited downloads"
                      : `${stats?.downloadsToday ?? 0}/3 downloads today`}
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
                  to="/settings"
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-elevated/60 transition flex items-center gap-2"
                >
                  <Settings className="h-3.5 w-3.5" /> Settings
                </Link>
                <button
                  onClick={signOut}
                  className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-elevated/60 transition flex items-center gap-2"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>

              </PopoverContent>
            </Popover>
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
            {preferences?.niche && (
              <p className="text-sm text-muted-foreground mt-2">
                Built for Gaming creators · {preferences.platforms?.join(" · ") || "all platforms"}
              </p>
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
                    {isPremium ? (stats?.downloads ?? 0).toLocaleString() : `${stats?.downloads ?? 0}/3`}
                  </div>
                  <Sparkline data={stats?.sparkline} className="text-accent" />
                </div>
                <DeltaLabel value={stats?.downloadsDelta} />
              </BentoCard>

              <Link to="/saved" className="md:col-span-3 group">
                <BentoCard className="h-full transition-colors group-hover:bg-elevated/40">
                  <CardHeader icon={<Bookmark className="h-4 w-4" />} title="Saved" />
                  <div className="mt-3 text-4xl font-semibold tracking-tight">{stats?.saved ?? activity.length}</div>
                  <DeltaLabel value={stats?.savedDelta} />
                </BentoCard>
              </Link>

              <BentoCard className="md:col-span-3">
                <CardHeader icon={<Bot className="h-4 w-4" />} title="AI runs" />
                <div className="mt-3 text-4xl font-semibold tracking-tight">{stats?.aiRuns ?? 0}</div>
                <DeltaLabel value={stats?.aiRunsDelta} />
              </BentoCard>

              <BentoCard className="md:col-span-3">
                <CardHeader icon={<Flame className="h-4 w-4" />} title="Streak" />
                <div className="mt-3 flex items-end gap-2">
                  <div className="text-4xl font-semibold tracking-tight">{stats?.streak ?? 0}d</div>
                  <div className="text-2xl pb-1">🔥</div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {(stats?.streak ?? 0) > 0 ? "Keep the fire alive" : "Start your streak today"}
                </div>
              </BentoCard>

              {/* Featured Trending Pack */}
              <BentoCard className="md:col-span-6 relative overflow-hidden">
                <div className="absolute -top-24 -right-16 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
                <div className="absolute top-4 right-4 flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  <span className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Trending pack</div>
                <h3 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] mt-2">Cinematic Reels Vol. 4</h3>
                <p className="text-sm text-muted-foreground mt-1">240 assets · LUTs, SFX, overlays</p>
              </BentoCard>

              {/* Recommended */}
              <BentoCard className="md:col-span-6">
                <div className="flex items-center justify-between">
                  <CardHeader icon={<Sparkles className="h-4 w-4 icon-fx" />} title="Picked for you" />
                  <Link to="/assets" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    Browse vault <ArrowUpRight className="h-3 w-3 icon-fx" />
                  </Link>
                </div>
                <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {recommended.map((p) => (
                    <button
                      key={p.slug}
                      onClick={() => openPack(p)}
                      disabled={p.premium && !isPremium}
                      className="group text-left relative"
                    >
                      <div className={`relative aspect-[4/3] rounded-2xl bg-gradient-to-br ${p.grad} overflow-hidden ring-1 ring-border`}>
                        <div className="absolute inset-0 ring-grid opacity-30" />
                        {p.premium && (
                          <div className="absolute top-2 right-2 glass-strong rounded-full px-2 py-0.5 text-[10px] flex items-center gap-1">
                            {!isPremium && <Lock className="h-2.5 w-2.5 icon-fx" />} Premium
                          </div>
                        )}
                        {p.premium && !isPremium && (
                          <div className="absolute inset-0 bg-background/40 backdrop-blur-sm flex items-center justify-center">
                            <Lock className="h-4 w-4 text-foreground/80 icon-fx" />
                          </div>
                        )}
                      </div>
                      <div className="mt-2.5">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.tag}</div>
                        <div className="text-sm font-medium mt-0.5">{p.title}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </BentoCard>

              {/* Upgrade CTA (free only) */}
              {!isPremium && (
                <BentoCard className="md:col-span-6 relative overflow-hidden">
                  <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-primary/30 blur-3xl" />
                  <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-accent/20 blur-3xl" />
                  <div className="relative flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-accent flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 icon-fx" /> Premium
                      </div>
                      <h3 className="text-2xl font-semibold tracking-[-0.02em] mt-2">Unlock the full vault & every AI tool.</h3>
                      <p className="text-sm text-muted-foreground mt-1">Cancel anytime. $12.99/month.</p>
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

          {activeTab === "assets" && (
            <motion.div
              key="assets"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-6 gap-4"
            >
              <BentoCard className="md:col-span-6">
                <div className="flex items-center justify-between mb-4">
                  <CardHeader icon={<Package className="h-4 w-4" />} title="All Asset Packs" />
                  <span className="text-xs text-muted-foreground">{ALL_PACKS.length} packs available</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {ALL_PACKS.map((p) => (
                    <button
                      key={p.slug}
                      onClick={() => openPack(p)}
                      disabled={p.premium && !isPremium}
                      className="group text-left relative"
                    >
                      <div className={`relative aspect-[4/3] rounded-2xl bg-gradient-to-br ${p.grad} overflow-hidden ring-1 ring-border`}>
                        <div className="absolute inset-0 ring-grid opacity-30" />
                        {p.premium && (
                          <div className="absolute top-2 right-2 glass-strong rounded-full px-2 py-0.5 text-[10px] flex items-center gap-1">
                            {!isPremium && <Lock className="h-2.5 w-2.5 icon-fx" />} Premium
                          </div>
                        )}
                        {p.premium && !isPremium && (
                          <div className="absolute inset-0 bg-background/40 backdrop-blur-sm flex items-center justify-center">
                            <Lock className="h-5 w-5 text-foreground/80 icon-fx" />
                          </div>
                        )}
                      </div>
                      <div className="mt-2.5">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.tag}</div>
                        <div className="text-sm font-medium mt-0.5">{p.title}</div>
                      </div>
                    </button>
                  ))}
                </div>
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
              <BentoCard className="md:col-span-6 relative overflow-hidden">
                <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-primary/25 blur-3xl" />
                <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-accent/20 blur-3xl" />
                <div className="relative">
                  <CardHeader icon={<Wand2 className="h-4 w-4" />} title="AI Studio" />
                  <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                    Generate hooks, captions, thumbnails, and scripts powered by AI. Premium tools unlock unlimited generations.
                  </p>
                </div>
              </BentoCard>

              <BentoCard className="md:col-span-3">
                <div className="flex items-center justify-between">
                  <CardHeader icon={<Zap className="h-4 w-4" />} title="Tools" />
                  <Link to="/ai" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    Open <ArrowUpRight className="h-3 w-3 icon-fx" />
                  </Link>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {AI_TOOLS.map((t) => {
                    const Icon = t.icon;
                    return (
                      <Link
                        key={t.name}
                        to="/ai"
                        className="relative p-3 rounded-xl glass hover:bg-elevated transition-colors text-left"
                      >
                        <Icon className="h-4 w-4 text-accent" />
                        <div className="text-sm font-medium mt-2">{t.name}</div>
                        {t.premium && (
                          <span className="absolute top-2 right-2 text-[9px] uppercase tracking-wider text-muted-foreground">Pro</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </BentoCard>

              <BentoCard className="md:col-span-3">
                <CardHeader icon={<Sparkles className="h-4 w-4" />} title="Usage" />
                <div className="mt-3 text-4xl font-semibold tracking-tight">{stats?.aiRuns ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">AI generations this month</div>
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
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{credits ? `${credits.remaining} credits left` : "—"}</span>
                  <span>Daily reset midnight UTC</span>
                </div>
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
                <CardHeader icon={<Activity className="h-4 w-4" />} title="Recent Activity" />
                <div className="mt-4 space-y-2">
                  {activity && activity.length > 0 ? (
                    activity.slice(0, 8).map((item: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-xl bg-elevated/40 hover:bg-elevated/60 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Download className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">{item.pack_title ?? "Unknown pack"}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.pack_category ?? "Asset"} · {new Date(item.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Math.round((item.progress ?? 0) * 100)}%
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      <Activity className="h-8 w-8 mx-auto mb-3 opacity-40" />
                      <p>No recent activity yet.</p>
                      <p className="text-xs mt-1">Start exploring packs to see your activity here.</p>
                    </div>
                  )}
                </div>
              </BentoCard>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <WorkspaceDock />
      </div>
    </div>
  );
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
  const values = data && data.length > 0 ? data : [2, 4, 3, 5, 4, 6, 7];
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
      {value}% this week
    </div>
  );
}
