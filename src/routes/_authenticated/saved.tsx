import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, BookmarkX, Download, Layers, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { AppHeader, AppHeaderLink } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { getSavedAssets, toggleSave } from "@/lib/assets.functions";

export const Route = createFileRoute("/_authenticated/saved")({
  ssr: false,
  head: () => ({ meta: [{ title: "Saved — Zentry Qor" }] }),
  component: SavedPage,
});

const GRADIENTS = [
  "from-primary/40 to-accent/20",
  "from-accent/40 to-primary/20",
  "from-primary/30 to-foreground/5",
  "from-accent/30 to-primary/10",
  "from-foreground/10 to-primary/20",
  "from-primary/20 to-accent/30",
];

function SavedPage() {
  const { user } = useAuth();
  const { isPremium } = useSubscription(user?.id);
  const qc = useQueryClient();
  const fetchSaved = useServerFn(getSavedAssets);
  const unsaveFn = useServerFn(toggleSave);

  const { data: saved = [], isLoading } = useQuery({
    queryKey: ["saved-assets"],
    queryFn: () => fetchSaved(),
  });

  async function unsave(id: string) {
    await unsaveFn({ data: { asset_id: id } });
    toast.success("Removed from saved");
    qc.invalidateQueries({ queryKey: ["saved-assets"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    qc.invalidateQueries({ queryKey: ["my-saved-ids"] });
  }

  async function download(a: (typeof saved)[number]) {
    if (a.premium_only && !isPremium) {
      toast.error("Premium membership required");
      return;
    }
    const { data, error } = await supabase.storage
      .from("assets")
      .createSignedUrl(a.storage_path, 60, { download: a.file_name });
    if (error || !data) {
      toast.error(error?.message ?? "Download failed");
      return;
    }
    window.open(data.signedUrl, "_blank");
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

        <main className="max-w-7xl mx-auto px-6 pt-28 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-10"
          >
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3 flex items-center gap-2">
              <Bookmark className="h-3 w-3 text-accent" /> Your library
            </div>
            <h1 className="text-4xl sm:text-6xl font-semibold tracking-[-0.03em] leading-[1.05]">
              Saved <span className="text-gradient-brand">assets</span>
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Everything you've bookmarked, ready to use whenever inspiration strikes.
            </p>
          </motion.div>

          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass rounded-3xl p-5 animate-pulse">
                  <div className="aspect-[16/10] rounded-2xl bg-elevated/60 mb-4" />
                  <div className="h-4 w-2/3 bg-elevated/60 rounded mb-2" />
                  <div className="h-3 w-full bg-elevated/40 rounded" />
                </div>
              ))}
            </div>
          ) : saved.length === 0 ? (
            <div className="glass rounded-3xl py-20 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-elevated flex items-center justify-center mb-4">
                <Bookmark className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium">No saved assets yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Tap the bookmark on any asset to save it here.
              </p>
              <Link
                to="/assets"
                className="mt-5 inline-flex h-9 px-4 rounded-full glass-strong text-xs font-medium magnetic items-center gap-1.5"
              >
                <Layers className="h-3 w-3" /> Browse the vault
              </Link>
            </div>
          ) : (
            <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {saved.map((a, i) => {
                  const locked = a.premium_only && !isPremium;
                  const grad = GRADIENTS[i % GRADIENTS.length];
                  return (
                    <motion.article
                      layout
                      key={a.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{ y: -4 }}
                      className="group relative glass rounded-3xl p-5 flex flex-col hover:bg-elevated/60 transition-colors"
                    >
                      <Link
                        to="/assets/$id"
                        params={{ id: a.id }}
                        className={`relative aspect-[16/10] rounded-2xl bg-gradient-to-br ${grad} overflow-hidden ring-1 ring-border mb-4 block`}
                      >
                        <div className="absolute inset-0 ring-grid opacity-30" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-5xl font-semibold tracking-tighter text-foreground/30 select-none">
                            {a.title.slice(0, 1).toUpperCase()}
                          </span>
                        </div>
                        {a.premium_only && (
                          <div className="absolute top-2 right-2 glass-strong rounded-full px-2 py-0.5 text-[10px] flex items-center gap-1">
                            {locked && <Lock className="h-2.5 w-2.5" />}
                            <Sparkles className="h-2.5 w-2.5 text-accent" /> Premium
                          </div>
                        )}
                      </Link>

                      <div className="text-[10px] uppercase tracking-wider text-accent mb-1">
                        {a.category}
                      </div>
                      <Link to="/assets/$id" params={{ id: a.id }} className="text-base font-medium tracking-tight hover:text-accent transition-colors">
                        {a.title}
                      </Link>
                      {a.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>
                      )}

                      <div className="mt-5 flex gap-2">
                        <button
                          onClick={() => download(a)}
                          disabled={locked}
                          className="flex-1 h-10 rounded-xl text-sm font-medium flex items-center justify-center gap-2 magnetic disabled:opacity-60 disabled:cursor-not-allowed bg-foreground text-background hover:bg-foreground/90 disabled:bg-elevated disabled:text-muted-foreground"
                        >
                          {locked ? <><Lock className="h-3.5 w-3.5" /> Locked</> : <><Download className="h-3.5 w-3.5" /> Download</>}
                        </button>
                        <button
                          onClick={() => unsave(a.id)}
                          className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Remove from saved"
                        >
                          <BookmarkX className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
