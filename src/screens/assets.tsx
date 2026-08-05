import { Link } from "@tanstack/react-router";
import { ProfileMenu } from "@/components/ProfileMenu";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  Download,
  Layers,
  Lock,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { AppHeader, AppHeaderLink } from "@/components/AppHeader";
import { FirstVisitTutorial } from "@/components/FirstVisitTutorial";
import { getMySavedIds, toggleSave } from "@/lib/assets.functions";
import { DownloadLimitModal } from "@/components/DownloadLimitModal";
import { downloadAsset, DownloadError, type DownloadLimitDetails } from "@/lib/download";


type AssetRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  file_name: string;
  storage_path: string;
  thumbnail_path: string | null;
  thumbnail_url?: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  premium_only: boolean;
  created_at: string;
};

const GRADIENTS = [
  "from-primary/40 to-accent/20",
  "from-accent/40 to-primary/20",
  "from-primary/30 to-foreground/5",
  "from-accent/30 to-primary/10",
  "from-foreground/10 to-primary/20",
  "from-primary/20 to-accent/30",
];

export function AssetsScreen() {
  const { user } = useAuth();
  const { isPremium } = useSubscription(user?.id);
  const qc = useQueryClient();
  const fetchSavedIds = useServerFn(getMySavedIds);
  const saveFn = useServerFn(toggleSave);

  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [tier, setTier] = useState<string>("all");
  const [limitDetails, setLimitDetails] = useState<DownloadLimitDetails | null>(null);

  const { data: savedIds = [] } = useQuery({
    queryKey: ["my-saved-ids"],
    queryFn: () => fetchSavedIds(),
  });
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      const rows = (data ?? []) as AssetRow[];
      const thumbPaths = rows.map((r) => r.thumbnail_path).filter(Boolean) as string[];
      if (thumbPaths.length) {
        const { data: signed } = await supabase.storage
          .from("assets")
          .createSignedUrls(thumbPaths, 3600);
        const urlMap = new Map<string, string>();
        (signed ?? []).forEach((s: any) => {
          if (s.path && s.signedUrl) urlMap.set(s.path, s.signedUrl);
        });
        rows.forEach((r) => {
          r.thumbnail_url = r.thumbnail_path ? urlMap.get(r.thumbnail_path) ?? null : null;
        });
      }
      setAssets(rows);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(assets.map((a) => a.category))).sort(),
    [assets],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (tier === "free" && a.premium_only) return false;
      if (tier === "premium" && !a.premium_only) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        (a.description ?? "").toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [assets, search, category, tier]);

  const totalCount = assets.length;
  const premiumCount = assets.filter((a) => a.premium_only).length;

  const download = async (a: AssetRow) => {
    if (a.premium_only && !isPremium) {
      toast.error("Premium membership required");
      return;
    }
    try {
      await downloadAsset(a.id, a.file_name);
    } catch (e) {
      const err = e as DownloadError;
      if (err.status === 429) {
        setLimitDetails(err.limitDetails ?? null);
        return;
      }
      toast.error(err.message ?? "Download failed");
      return;
    }
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  const toggleSaved = async (e: React.MouseEvent, a: AssetRow) => {
    e.stopPropagation();
    e.preventDefault();
    const res = await saveFn({ data: { asset_id: a.id } });
    toast.success(res.saved ? "Saved" : "Removed from saved");
    qc.invalidateQueries({ queryKey: ["my-saved-ids"] });
    qc.invalidateQueries({ queryKey: ["saved-assets"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };


  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <FirstVisitTutorial
        storageKey="tutorial:assets:v1"
        title="Vault"
        steps={[
          { title: "Your creative vault", body: "Thousands of curated assets — presets, LUTs, overlays, and UI kits. Search or filter by category to find what you need." },
          { title: "Save & download", body: "Bookmark favorites and download them anytime. Free plan gets 3 downloads/day; Premium is unlimited." },
          { title: "Premium packs", body: "Items with a lock icon are Premium-only. Upgrade to unlock the full catalog and skip the daily cap." },
        ]}
      />
      <AnimatedOrbs />

      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
        aria-hidden
      />

      <div className="relative pb-28">
        <AppHeader
          nav={
            <>
              <AppHeaderLink to="/dashboard">Dashboard</AppHeaderLink>
              <AppHeaderLink to="/assets" active>Vault</AppHeaderLink>
              <AppHeaderLink to="/saved">Saved</AppHeaderLink>
              <AppHeaderLink to="/ai">AI Studio</AppHeaderLink>
            </>
          }
          right={
            <div className="flex items-center gap-2">
              {!isPremium && (
                <Link
                  to="/billing"
                  className="hidden sm:inline-flex h-8 sm:h-9 px-3 rounded-full glass items-center gap-1.5 text-xs font-medium"
                >
                  <Sparkles className="h-3 w-3 text-accent icon-fx" /> Upgrade
                </Link>
              )}
              <ProfileMenu />
            </div>
          }
        />
        

        <main className="max-w-7xl mx-auto px-6 pt-28 pb-12">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-10"
          >
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3 flex items-center gap-2">
              <Layers className="h-3 w-3 text-accent" /> The Vault
            </div>
            <h1 className="text-4xl sm:text-6xl font-semibold tracking-[-0.03em] leading-[1.05]">
              Every asset.{" "}
              <span className="text-gradient-brand">One vault.</span>
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Drop into a curated library of presets, overlays, templates and
              motion packs — engineered to ship faster.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
              <Stat label="Total assets" value={totalCount} />
              <Stat label="Premium" value={premiumCount} accent />
              <Stat label="Categories" value={categories.length} />
            </div>
          </motion.div>

          {/* Filter bar */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass-strong rounded-2xl p-3 mb-8 flex flex-col md:flex-row gap-3"
          >
            <div className="relative flex h-11 flex-1 shrink-0 items-center rounded-xl bg-background/40 border border-border/60 transition focus-within:ring-2 focus-within:ring-primary/40">
              <span className="pointer-events-none flex h-11 w-11 shrink-0 items-center justify-center">
                <Search className="h-4 w-4 text-muted-foreground icon-fx" />
              </span>
              <input
                placeholder="Search title, tags, description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full min-w-0 flex-1 bg-transparent pr-2 text-sm placeholder:text-muted-foreground/70 focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-elevated transition"
                >
                  <X className="h-3 w-3 icon-fx" />
                </button>
              )}
            </div>


            <div className="flex gap-2 overflow-x-auto md:overflow-visible">
              <Chip active={tier === "all"} onClick={() => setTier("all")}>
                All
              </Chip>
              <Chip active={tier === "free"} onClick={() => setTier("free")}>
                Free
              </Chip>
              <Chip
                active={tier === "premium"}
                onClick={() => setTier("premium")}
                accent
              >
                <Sparkles className="h-3 w-3 icon-fx" /> Premium
              </Chip>
            </div>
          </motion.div>

          {/* Category chips */}
          {categories.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              <CatChip
                active={category === "all"}
                onClick={() => setCategory("all")}
              >
                All categories
              </CatChip>
              {categories.map((c) => (
                <CatChip
                  key={c}
                  active={category === c}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </CatChip>
              ))}
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <SkeletonGrid />
          ) : filtered.length === 0 ? (
            <EmptyState onReset={() => {
              setSearch("");
              setCategory("all");
              setTier("all");
            }} />
          ) : (
            <motion.div
              layout
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              <AnimatePresence mode="popLayout">
                {filtered.map((a, i) => {
                  const locked = a.premium_only && !isPremium;
                  const grad = GRADIENTS[i % GRADIENTS.length];
                  return (
                    <motion.article
                      layout
                      key={a.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{
                        duration: 0.45,
                        delay: Math.min(i * 0.04, 0.4),
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      whileHover={{ y: -4 }}
                      className="group relative glass rounded-3xl p-5 flex flex-col hover:bg-elevated/60 transition-colors"
                    >
                      {/* Thumbnail */}
                      <Link
                        to="/assets/$id"
                        params={{ id: a.id }}
                        className={`relative aspect-[16/10] rounded-2xl bg-gradient-to-br ${grad} overflow-hidden ring-1 ring-border mb-4 block`}
                      >
                        {a.thumbnail_url ? (
                          <img
                            src={a.thumbnail_url}
                            alt={a.title}
                            loading="lazy"
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <>
                            <div className="absolute inset-0 ring-grid opacity-30" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-5xl font-semibold tracking-tighter text-foreground/30 select-none">
                                {a.title.slice(0, 1).toUpperCase()}
                              </span>
                            </div>
                          </>
                        )}
                        <label
                          className="ui-bookmark absolute top-2 left-2 h-8 w-8 rounded-full glass-strong"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={savedSet.has(a.id) ? "Unsave" : "Save"}
                        >
                          <input
                            type="checkbox"
                            checked={savedSet.has(a.id)}
                            onChange={(e) => toggleSaved(e as unknown as React.MouseEvent, a)}
                          />
                          <svg className="bookmark" viewBox="0 0 32 32">
                            <path d="M27 4v27a1 1 0 0 1-1.625.781L16 24.281l-9.375 7.5A1 1 0 0 1 5 31V4a4 4 0 0 1 4-4h14a4 4 0 0 1 4 4z" />
                          </svg>
                        </label>
                        {a.premium_only && (
                          <div className="absolute top-2 right-2 glass-strong rounded-full px-2 py-0.5 text-[10px] flex items-center gap-1">
                            {locked && <Lock className="h-2.5 w-2.5 icon-fx" />}
                            <Sparkles className="h-2.5 w-2.5 text-accent icon-fx" />
                            Premium
                          </div>
                        )}
                        {locked && (
                          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                            <div className="glass-strong rounded-full h-10 w-10 flex items-center justify-center">
                              <Lock className="h-4 w-4 text-foreground/80 icon-fx" />
                            </div>
                          </div>
                        )}
                      </Link>

                      {/* Meta */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="text-[10px] uppercase tracking-wider text-accent">
                          {a.category}
                        </div>
                        {a.size_bytes ? (
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {(a.size_bytes / 1024).toFixed(1)} KB
                          </div>
                        ) : null}
                      </div>
                      <Link to="/assets/$id" params={{ id: a.id }} className="text-base font-medium tracking-tight hover:text-accent transition-colors">
                        {a.title}
                      </Link>
                      {a.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {a.description}
                        </p>
                      )}

                      {a.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {a.tags.slice(0, 4).map((t) => (
                            <span
                              key={t}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-elevated/70 text-muted-foreground"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Action */}
                      <button
                        onClick={() => download(a)}
                        disabled={locked}
                        className="mt-5 h-10 rounded-xl text-sm font-medium flex items-center justify-center gap-2 magnetic disabled:opacity-60 disabled:cursor-not-allowed transition-colors bg-foreground text-background hover:bg-foreground/90 disabled:bg-elevated disabled:text-muted-foreground"
                      >
                        {locked ? (
                          <>
                            <Lock className="h-3.5 w-3.5 icon-fx" /> Unlock with Premium
                          </>
                        ) : (
                          <>
                            <Download className="h-3.5 w-3.5" /> Download
                            <ArrowUpRight className="h-3 w-3 opacity-60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform icon-fx" />
                          </>
                        )}
                      </button>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Upgrade footer */}
          {!isPremium && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6 }}
              className="mt-16 relative overflow-hidden glass rounded-3xl p-8 sm:p-10"
            >
              <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
              <div className="relative flex flex-wrap items-center justify-between gap-6">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-accent flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 icon-fx" /> Premium
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] mt-2">
                    Unlock the full vault.
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Every premium asset, every AI tool. Cancel anytime.
                  </p>
                </div>
                <Link
                  to="/billing"
                  className="h-11 px-6 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-medium glow-primary magnetic flex items-center gap-2"
                >
                  Upgrade now <ArrowUpRight className="h-3.5 w-3.5 icon-fx" />
                </Link>
              </div>
            </motion.div>
          )}
        </main>
        <DownloadLimitModal
          details={limitDetails}
          open={!!limitDetails}
          onOpenChange={(open) => !open && setLimitDetails(null)}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="glass rounded-full px-3 py-1.5 flex items-center gap-2">
      <span
        className={`font-semibold tabular-nums ${accent ? "text-gradient-brand" : ""}`}
      >
        {value}
      </span>
      <span className="text-muted-foreground uppercase tracking-wider text-[10px]">
        {label}
      </span>
    </div>
  );
}

function Chip({
  children,
  active,
  accent,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  accent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-11 px-4 rounded-xl text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 transition-all whitespace-nowrap ${
        active
          ? accent
            ? "bg-gradient-to-r from-primary to-accent text-primary-foreground glow-primary"
            : "bg-foreground text-background"
          : "bg-background/40 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-elevated"
      }`}
    >
      {children}
    </button>
  );
}

function CatChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 h-8 rounded-full text-xs transition-colors ${
        active
          ? "bg-elevated text-foreground ring-1 ring-border"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass rounded-3xl p-5 animate-pulse">
          <div className="aspect-[16/10] rounded-2xl bg-elevated/60 mb-4" />
          <div className="h-3 w-16 bg-elevated/60 rounded mb-3" />
          <div className="h-4 w-2/3 bg-elevated/60 rounded mb-2" />
          <div className="h-3 w-full bg-elevated/40 rounded" />
          <div className="h-10 w-full bg-elevated/40 rounded-xl mt-5" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="glass rounded-3xl py-20 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-elevated flex items-center justify-center mb-4">
        <Search className="h-5 w-5 text-muted-foreground icon-fx" />
      </div>
      <h3 className="text-base font-medium">Nothing matches yet</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Try different keywords or clear your filters.
      </p>
      <button
        onClick={onReset}
        className="mt-5 h-9 px-4 rounded-full glass-strong text-xs font-medium magnetic"
      >
        Reset filters
      </button>
    </div>
  );
}
