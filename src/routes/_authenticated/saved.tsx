import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Bookmark, BookmarkX, Download, Folder, FileArchive, Lock, Sparkles, Search, ChevronRight, Loader2, CheckSquare, Square, File as FileIcon } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { AppHeader, AppHeaderLink } from "@/components/AppHeader";
import { DownloadLimitModal } from "@/components/DownloadLimitModal";
import { downloadAsset, DownloadError, type DownloadLimitDetails } from "@/lib/download";
import { getSavedAssets, toggleSave } from "@/lib/assets.functions";

export const Route = createFileRoute("/_authenticated/saved")({
  ssr: false,
  head: () => ({ meta: [{ title: "Saved — Zentry Qor" }] }),
  component: SavedPage,
});

function formatBytes(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function SavedPage() {
  const { user } = useAuth();
  const { isPremium } = useSubscription(user?.id);
  const qc = useQueryClient();
  const fetchSaved = useServerFn(getSavedAssets);
  const unsaveFn = useServerFn(toggleSave);

  const [limitDetails, setLimitDetails] = useState<DownloadLimitDetails | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState<{ done: number; total: number } | null>(null);

  const { data: saved = [], isLoading } = useQuery({
    queryKey: ["saved-assets"],
    queryFn: () => fetchSaved(),
  });

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = saved.filter((a) =>
      !q ||
      a.title.toLowerCase().includes(q) ||
      a.file_name.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      (a.description ?? "").toLowerCase().includes(q),
    );
    const map = new Map<string, typeof filtered>();
    for (const a of filtered) {
      const key = a.category || "Uncategorized";
      const bucket = map.get(key) ?? [];
      bucket.push(a);
      map.set(key, bucket);
    }
    // GitHub-style: folders first alphabetically, files inside sorted by name
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cat, items]) => ({
        cat,
        items: items.slice().sort((a, b) => a.file_name.localeCompare(b.file_name)),
      }));
  }, [saved, query]);

  const allIds = useMemo(() => grouped.flatMap((g) => g.items.map((i) => i.id)), [grouped]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  function toggleId(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  }
  function toggleCat(cat: string) {
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  async function unsave(id: string) {
    await unsaveFn({ data: { asset_id: id } });
    toast.success("Removed from saved");
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    qc.invalidateQueries({ queryKey: ["saved-assets"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    qc.invalidateQueries({ queryKey: ["my-saved-ids"] });
  }

  async function downloadOne(a: (typeof saved)[number]) {
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
  }

  async function fetchSignedUrl(id: string, token: string) {
    const res = await fetch(`/api/public/assets/download/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload?.url) {
      const err = new DownloadError(payload?.error || "Download failed", res.status, {
        downloadsUsed: payload.downloadsUsed ?? null,
        downloadsRemaining: payload.downloadsRemaining ?? null,
        dailyLimit: payload.dailyLimit ?? null,
        resetAt: payload.resetAt ?? null,
        message: payload.error ?? null,
      });
      throw err;
    }
    return { url: payload.url as string, filename: (payload.filename as string) || "asset" };
  }

  async function downloadZip() {
    const targets = saved.filter((a) => selected.has(a.id));
    if (targets.length === 0) {
      toast.error("Select at least one asset");
      return;
    }
    const locked = targets.filter((a) => a.premium_only && !isPremium);
    if (locked.length > 0) {
      toast.error(`${locked.length} premium asset${locked.length === 1 ? "" : "s"} in your selection — upgrade or deselect them.`);
      return;
    }

    setZipping(true);
    setZipProgress({ done: 0, total: targets.length });
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Please sign in again to download.");

      const zip = new JSZip();
      let done = 0;
      // Sequential to respect per-user rate limits and avoid spikes
      for (const a of targets) {
        try {
          const { url, filename } = await fetchSignedUrl(a.id, token);
          const blob = await fetch(url).then((r) => {
            if (!r.ok) throw new Error(`Failed to fetch ${filename}`);
            return r.blob();
          });
          const folder = zip.folder(a.category || "Uncategorized")!;
          // Prefix with id-slice to avoid collisions on same file_name
          const safeName = filename.replace(/[/\\]/g, "_");
          folder.file(safeName, blob);
        } catch (e) {
          if (e instanceof DownloadError && e.status === 429) {
            setLimitDetails(e.limitDetails ?? null);
            throw e;
          }
          console.error("zip item failed", a.id, e);
          toast.error(`Skipped ${a.file_name}: ${(e as Error).message}`);
        }
        done += 1;
        setZipProgress({ done, total: targets.length });
      }

      const out = await zip.generateAsync({ type: "blob" }, (meta) => {
        // Optional: could show compression progress
        if (meta.percent >= 99) setZipProgress({ done: targets.length, total: targets.length });
      });
      const href = URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = href;
      a.download = `zentry-saved-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      toast.success(`Downloaded ${targets.length} asset${targets.length === 1 ? "" : "s"} as ZIP`);
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (e) {
      if (!(e instanceof DownloadError)) toast.error((e as Error).message ?? "ZIP download failed");
    } finally {
      setZipping(false);
      setZipProgress(null);
    }
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <AnimatedOrbs />
      <div className="relative">
        <AppHeader
          nav={
            <>
              <AppHeaderLink to="/dashboard">Dashboard</AppHeaderLink>
              <AppHeaderLink to="/assets">Vault</AppHeaderLink>
              <AppHeaderLink to="/saved" active>Saved</AppHeaderLink>
              <AppHeaderLink to="/ai">AI Studio</AppHeaderLink>
            </>
          }
        />

        <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-16">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3 flex items-center gap-2">
              <Bookmark className="h-3 w-3 text-accent" /> Your library
            </div>
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.03em] leading-[1.05]">
              Saved <span className="text-gradient-brand">assets</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              Bookmark packs, LUTs, overlays and sound FX to bundle them into a single ZIP.
            </p>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter files…"
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-elevated/60 border border-border text-sm outline-none focus:border-accent/60"
              />
            </div>
            <button
              type="button"
              onClick={toggleAll}
              disabled={allIds.length === 0}
              className="h-9 px-3 rounded-lg glass-strong text-xs font-medium flex items-center gap-1.5 disabled:opacity-40"
            >
              {allSelected ? <CheckSquare className="h-3.5 w-3.5 text-accent" /> : <Square className="h-3.5 w-3.5" />}
              {allSelected ? "Clear" : "Select all"}
            </button>
            <button
              type="button"
              onClick={downloadZip}
              disabled={selected.size === 0 || zipping}
              className="h-9 px-4 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-foreground text-background disabled:bg-elevated disabled:text-muted-foreground"
            >
              {zipping ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Zipping {zipProgress ? `${zipProgress.done}/${zipProgress.total}` : ""}
                </>
              ) : (
                <>
                  <FileArchive className="h-3.5 w-3.5" />
                  Download ZIP {selected.size > 0 ? `(${selected.size})` : ""}
                </>
              )}
            </button>
          </div>

          {/* GitHub-style file browser */}
          {isLoading ? (
            <div className="rounded-xl border border-border overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-11 border-b border-border/60 last:border-b-0 animate-pulse bg-elevated/30" />
              ))}
            </div>
          ) : allIds.length === 0 ? (
            <div className="glass rounded-3xl py-20 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-elevated flex items-center justify-center mb-4">
                <Bookmark className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium">{query ? "Nothing matches your filter" : "No saved assets yet"}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {query ? "Try a different keyword." : "Tap the bookmark on any asset to save it here."}
              </p>
              {!query && (
                <Link
                  to="/assets"
                  className="mt-5 inline-flex h-9 px-4 rounded-full glass-strong text-xs font-medium items-center gap-1.5"
                >
                  Browse the vault
                </Link>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden bg-elevated/20">
              {/* Header row */}
              <div className="hidden sm:grid grid-cols-[auto_auto_1fr_120px_120px_auto] items-center gap-3 px-4 py-2 border-b border-border bg-elevated/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <div className="w-4" />
                <div className="w-4" />
                <div>Name</div>
                <div>Size</div>
                <div>Saved</div>
                <div className="w-20 text-right pr-1">Actions</div>
              </div>

              {grouped.map(({ cat, items }) => {
                const catIds = items.map((i) => i.id);
                const catAllSelected = catIds.every((id) => selected.has(id));
                const isOpen = openCats.has(cat) || query.length > 0;
                return (
                  <div key={cat} className="border-b border-border/60 last:border-b-0">
                    {/* Folder row */}
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-elevated/30 hover:bg-elevated/50 transition-colors">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (catAllSelected) catIds.forEach((id) => next.delete(id));
                            else catIds.forEach((id) => next.add(id));
                            return next;
                          });
                        }}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={catAllSelected ? "Deselect folder" : "Select folder"}
                      >
                        {catAllSelected ? <CheckSquare className="h-4 w-4 text-accent" /> : <Square className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCat(cat)}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
                      >
                        <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                        <Folder className="h-4 w-4 text-accent" />
                        <span className="text-sm font-medium truncate">{cat}</span>
                        <span className="text-[11px] text-muted-foreground">{items.length}</span>
                      </button>
                    </div>

                    {/* File rows */}
                    {isOpen && items.map((a) => {
                      const locked = a.premium_only && !isPremium;
                      const checked = selected.has(a.id);
                      return (
                        <div
                          key={a.id}
                          className="grid grid-cols-[auto_auto_1fr_auto] sm:grid-cols-[auto_auto_1fr_120px_120px_auto] items-center gap-3 px-4 py-2.5 border-t border-border/40 hover:bg-elevated/40 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => toggleId(a.id)}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label={checked ? "Deselect" : "Select"}
                          >
                            {checked ? <CheckSquare className="h-4 w-4 text-accent" /> : <Square className="h-4 w-4" />}
                          </button>
                          <FileIcon className="h-4 w-4 text-muted-foreground" />
                          <Link
                            to="/assets/$id"
                            params={{ id: a.id }}
                            className="min-w-0 flex items-center gap-2 hover:text-accent transition-colors"
                          >
                            <span className="text-sm truncate">{a.file_name}</span>
                            {a.premium_only && (
                              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] rounded-full glass-strong px-1.5 py-0.5">
                                {locked && <Lock className="h-2.5 w-2.5" />}
                                <Sparkles className="h-2.5 w-2.5 text-accent" /> Premium
                              </span>
                            )}
                          </Link>
                          <div className="hidden sm:block text-xs text-muted-foreground">{formatBytes(a.size_bytes)}</div>
                          <div className="hidden sm:block text-xs text-muted-foreground">{formatDate(a.saved_at)}</div>
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              type="button"
                              onClick={() => downloadOne(a)}
                              disabled={locked}
                              className="h-8 w-8 rounded-md hover:bg-elevated flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                              aria-label="Download"
                              title="Download"
                            >
                              {locked ? <Lock className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => unsave(a.id)}
                              className="h-8 w-8 rounded-md hover:bg-elevated flex items-center justify-center text-muted-foreground hover:text-foreground"
                              aria-label="Remove from saved"
                              title="Remove from saved"
                            >
                              <BookmarkX className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {selected.size > 0 && !zipping && (
            <p className="mt-3 text-xs text-muted-foreground">
              {selected.size} selected. ZIP download counts each asset against your daily download quota.
            </p>
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
