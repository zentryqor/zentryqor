import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  Lock,
  Search,
  Sparkles,
  X,
  Bookmark,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { WorkspaceShell, SectionLabel } from "@/components/WorkspaceShell";
import { getMySavedIds, toggleSave } from "@/lib/assets.functions";
import { DownloadLimitModal } from "@/components/DownloadLimitModal";
import { downloadAsset, DownloadError, type DownloadLimitDetails } from "@/lib/download";

export const Route = createFileRoute("/_authenticated/assets/")({
  ssr: false,
  head: () => ({ meta: [{ title: "Vault — Zentry Qor" }] }),
  component: AssetsPage,
});

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

function AssetsPage() {
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

  const { data: savedIds = [] } = useQuery({ queryKey: ["my-saved-ids"], queryFn: () => fetchSavedIds() });
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("assets").select("*").order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      const rows = (data ?? []) as AssetRow[];
      const thumbPaths = rows.map((r) => r.thumbnail_path).filter(Boolean) as string[];
      if (thumbPaths.length) {
        const { data: signed } = await supabase.storage.from("assets").createSignedUrls(thumbPaths, 3600);
        const urlMap = new Map<string, string>();
        (signed ?? []).forEach((s: any) => { if (s.path && s.signedUrl) urlMap.set(s.path, s.signedUrl); });
        rows.forEach((r) => { r.thumbnail_url = r.thumbnail_path ? urlMap.get(r.thumbnail_path) ?? null : null; });
      }
      setAssets(rows);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => Array.from(new Set(assets.map((a) => a.category))).sort(), [assets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (tier === "free" && a.premium_only) return false;
      if (tier === "premium" && !a.premium_only) return false;
      if (!q) return true;
      return a.title.toLowerCase().includes(q) ||
        (a.description ?? "").toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q));
    });
  }, [assets, search, category, tier]);

  const totalCount = assets.length;
  const premiumCount = assets.filter((a) => a.premium_only).length;

  const download = async (a: AssetRow) => {
    if (a.premium_only && !isPremium) { toast.error("Premium required"); return; }
    try { await downloadAsset(a.id, a.file_name); }
    catch (e) {
      const err = e as DownloadError;
      if (err.status === 429) { setLimitDetails(err.limitDetails ?? null); return; }
      toast.error(err.message ?? "Download failed"); return;
    }
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  const toggleSaved = async (e: React.MouseEvent, a: AssetRow) => {
    e.stopPropagation(); e.preventDefault();
    const res = await saveFn({ data: { asset_id: a.id } });
    toast.success(res.saved ? "Saved" : "Removed");
    qc.invalidateQueries({ queryKey: ["my-saved-ids"] });
    qc.invalidateQueries({ queryKey: ["saved-assets"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  return (
    <WorkspaceShell
      path={["vault"]}
      isPremium={isPremium}
      meta={
        <span className="font-mono-display tabular-nums">
          {filtered.length}/{totalCount}
        </span>
      }
      actions={
        !isPremium && (
          <Link
            to="/billing"
            className="h-8 px-3 rounded-md bg-accent text-accent-foreground text-[11px] font-mono-display font-medium flex items-center gap-1.5"
          >
            <Sparkles className="h-3 w-3" strokeWidth={2} /> upgrade
          </Link>
        )
      }
    >
      <div className="mb-8">
        <div className="text-[11px] font-mono-display text-muted-foreground">
          &gt; grep -r ./vault
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-mono-display tracking-tight">
          the vault <span className="text-muted-foreground">/ {categories.length} categories</span>
        </h1>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-mono-display text-muted-foreground tabular-nums">
          <span>total: <span className="text-foreground">{totalCount}</span></span>
          <span>·</span>
          <span>premium: <span className="text-accent">{premiumCount}</span></span>
          <span>·</span>
          <span>free: <span className="text-foreground">{totalCount - premiumCount}</span></span>
        </div>
      </div>

      {/* Search + tier chips */}
      <div className="terminal-panel rounded-md p-2 mb-4 flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
          <input
            placeholder="search title, tags, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-9 rounded-sm bg-transparent border border-border/60 text-sm font-mono-display placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/60"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" strokeWidth={2} />
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {(["all", "free", "premium"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={`h-9 px-3 rounded-sm text-[11px] font-mono-display transition-colors ${
                tier === t
                  ? t === "premium" ? "bg-accent text-accent-foreground" : "bg-foreground text-background"
                  : "terminal-panel-inset text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Category chips */}
      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategory("all")}
            className={`h-7 px-2.5 rounded-sm text-[11px] font-mono-display transition-colors ${
              category === "all" ? "bg-elevated text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            all
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`h-7 px-2.5 rounded-sm text-[11px] font-mono-display transition-colors ${
                category === c ? "bg-elevated text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <SectionLabel right={`[${filtered.length}]`}>results</SectionLabel>
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="terminal-panel rounded-sm animate-pulse">
              <div className="aspect-[16/10] bg-elevated/40" />
              <div className="p-3 space-y-2">
                <div className="h-2 w-16 bg-elevated/60 rounded" />
                <div className="h-3 w-3/4 bg-elevated/60 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="terminal-panel rounded-md py-16 text-center">
          <div className="text-[11px] font-mono-display text-muted-foreground">
            &gt; no matches. try clearing filters.
          </div>
          <button
            onClick={() => { setSearch(""); setCategory("all"); setTier("all"); }}
            className="mt-4 h-8 px-3 rounded-sm terminal-panel-inset text-[11px] font-mono-display hover:bg-elevated/50"
          >
            reset
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((a) => {
            const locked = a.premium_only && !isPremium;
            const isSaved = savedSet.has(a.id);
            return (
              <article key={a.id} className="terminal-panel rounded-sm overflow-hidden group hover:border-accent/40 transition-colors flex flex-col">
                <Link to="/assets/$id" params={{ id: a.id }} className="relative aspect-[16/10] block bg-elevated/30">
                  {a.thumbnail_url ? (
                    <img src={a.thumbnail_url} alt={a.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-3xl font-mono-display text-foreground/25">
                      {a.title.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <button
                    onClick={(e) => toggleSaved(e, a)}
                    className="absolute top-1.5 left-1.5 h-7 w-7 rounded-sm bg-background/80 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-accent"
                    aria-label={isSaved ? "Unsave" : "Save"}
                  >
                    <Bookmark className={`h-3.5 w-3.5 ${isSaved ? "fill-accent text-accent" : ""}`} strokeWidth={1.75} />
                  </button>
                  {a.premium_only && (
                    <div className="absolute top-1.5 right-1.5 bg-background/80 backdrop-blur px-1.5 py-0.5 rounded-sm text-[9px] font-mono-display uppercase tracking-wider text-accent flex items-center gap-1">
                      {locked && <Lock className="h-2.5 w-2.5" strokeWidth={2} />} pro
                    </div>
                  )}
                </Link>

                <div className="p-3 flex flex-col flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="text-[9px] font-mono-display uppercase tracking-[0.18em] text-accent">
                      {a.category}
                    </div>
                    {a.size_bytes && (
                      <div className="text-[9px] font-mono-display text-muted-foreground tabular-nums">
                        {(a.size_bytes / 1024).toFixed(1)}kb
                      </div>
                    )}
                  </div>
                  <Link to="/assets/$id" params={{ id: a.id }} className="text-sm font-medium tracking-tight hover:text-accent transition-colors line-clamp-1">
                    {a.title}
                  </Link>
                  {a.description && (
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 flex-1">
                      {a.description}
                    </p>
                  )}
                  <button
                    onClick={() => download(a)}
                    disabled={locked}
                    className="mt-3 h-8 rounded-sm text-[11px] font-mono-display font-medium flex items-center justify-center gap-1.5 transition-colors bg-elevated/60 hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-elevated/60 disabled:hover:text-foreground"
                  >
                    {locked ? (
                      <><Lock className="h-3 w-3" strokeWidth={2} /> unlock</>
                    ) : (
                      <><Download className="h-3 w-3" strokeWidth={2} /> download <ArrowUpRight className="h-2.5 w-2.5 opacity-60" strokeWidth={2} /></>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!isPremium && !loading && (
        <div className="mt-10 terminal-panel rounded-md p-5 sm:p-6 flex items-center justify-between gap-4 flex-wrap border-accent/30">
          <div className="min-w-0">
            <div className="text-[10px] font-mono-display uppercase tracking-[0.22em] text-accent"># premium</div>
            <div className="mt-1.5 text-base sm:text-lg font-medium">Unlock the full vault.</div>
            <div className="text-[11px] text-muted-foreground font-mono-display mt-1">$12.99/mo · cancel anytime</div>
          </div>
          <Link
            to="/billing"
            className="h-9 px-4 rounded-md bg-accent text-accent-foreground text-xs font-mono-display font-medium flex items-center gap-1.5"
          >
            upgrade <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
          </Link>
        </div>
      )}

      <DownloadLimitModal
        details={limitDetails}
        open={!!limitDetails}
        onOpenChange={(open) => !open && setLimitDetails(null)}
      />
    </WorkspaceShell>
  );
}
