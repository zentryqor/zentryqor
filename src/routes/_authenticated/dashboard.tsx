import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
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
  TrendingUp,
  Wand2,
  Zap,
  Bot,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext, trackVaultView } from "@/lib/preferences.functions";
import { PremiumBadge, PremiumLockOverlay } from "@/components/PremiumLock";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { AppHeader, AppHeaderLink } from "@/components/AppHeader";

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
  const track = useServerFn(trackVaultView);
  const { data: ctx, isLoading } = useQuery({ queryKey: ["me"], queryFn: () => fetchCtx() });
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

  const trending = ALL_PACKS.slice(0, 3);

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
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-semibold text-primary-foreground">
              {firstName[0]?.toUpperCase()}
            </div>
            <button onClick={signOut} className="h-8 w-8 sm:h-9 sm:w-9 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-foreground">
              <LogOut className="h-3.5 w-3.5 icon-fx" />
            </button>
          </>
        }
      />

      <main className="max-w-7xl mx-auto px-6 pt-28 pb-10">
        {/* Greeting */}
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em]">
              Welcome back, <span className="text-gradient-brand">{firstName}</span>.
            </h1>
            {preferences?.niche && (
              <p className="text-sm text-muted-foreground mt-2">
                Curated for {preferences.niche} · {preferences.platforms?.join(" · ") || "all platforms"}
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

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Stats */}
          <BentoCard className="md:col-span-2">
            <CardHeader icon={<Download className="h-4 w-4" />} title="Downloads" />
            <div className="mt-3 text-4xl font-semibold tracking-tight text-gradient-brand">
              {isPremium ? "∞" : "0/3"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{isPremium ? "Unlimited" : "Daily limit"}</div>
          </BentoCard>

          <BentoCard className="md:col-span-2">
            <CardHeader icon={<Bookmark className="h-4 w-4" />} title="Saved" />
            <div className="mt-3 text-4xl font-semibold tracking-tight">{activity.length}</div>
            <div className="text-xs text-muted-foreground mt-1">In your vault</div>
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

          {/* AI Tools */}
          <BentoCard className="md:col-span-3">
            <div className="flex items-center justify-between">
              <CardHeader icon={<Wand2 className="h-4 w-4" />} title="AI Studio" />
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
                  </Link>
                );
              })}
            </div>
          </BentoCard>

          {/* Trending */}
          <BentoCard className="md:col-span-3">
            <CardHeader icon={<TrendingUp className="h-4 w-4" />} title="Trending this week" />
            <div className="mt-4 space-y-2">
              {trending.map((p, i) => (
                <button key={p.slug} onClick={() => openPack(p)} className="w-full p-2.5 rounded-xl hover:bg-elevated transition-colors flex items-center gap-3 text-left">
                  <div className="text-xs text-muted-foreground w-4">{i + 1}</div>
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${p.grad} ring-1 ring-border`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.title}</div>
                    <div className="text-xs text-muted-foreground">{p.tag}</div>
                  </div>
                  <Flame className="h-3.5 w-3.5 text-accent" />
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
        </div>
      </main>
      </div>
    </div>
  );
}


function NavTab({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button
      className={`px-3 h-9 rounded-full text-sm transition-colors ${
        active ? "bg-elevated text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
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
