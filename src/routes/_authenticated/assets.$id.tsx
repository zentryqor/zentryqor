import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Download,
  Lock,
  Share2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import {
  getAssetDetails,
  recordDownload,
  toggleSave,
} from "@/lib/assets.functions";

export const Route = createFileRoute("/_authenticated/assets/$id")({
  ssr: false,
  head: () => ({ meta: [{ title: "Asset — Zentry Qor" }] }),
  component: AssetDetailsPage,
});

function formatSize(bytes: number | null | undefined) {
  if (!bytes) return "—";
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return `${mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function AssetDetailsPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isPremium } = useSubscription(user?.id);

  const fetchDetails = useServerFn(getAssetDetails);
  const saveFn = useServerFn(toggleSave);
  const trackDl = useServerFn(recordDownload);

  const { data, isLoading } = useQuery({
    queryKey: ["asset-details", id],
    queryFn: () => fetchDetails({ data: { id } }),
  });

  const asset = data?.asset;
  const thumbnailUrl = data?.thumbnailUrl ?? null;
  const saved = !!data?.saved;
  const locked = asset?.premium_only && !isPremium;

  async function onDownload() {
    if (!asset) return;
    if (locked) {
      toast.error("Premium membership required");
      return;
    }
    try {
      await trackDl({ data: { asset_id: asset.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Download failed");
      return;
    }
    const { data: signed, error } = await supabase.storage
      .from("assets")
      .createSignedUrl(asset.storage_path, 60, { download: asset.file_name });
    if (error || !signed) {
      toast.error(error?.message ?? "Download failed");
      return;
    }
    window.open(signed.signedUrl, "_blank");
    qc.invalidateQueries({ queryKey: ["asset-details", id] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  }

  async function onSaveToggle() {
    if (!asset) return;
    const res = await saveFn({ data: { asset_id: asset.id } });
    toast.success(res.saved ? "Saved to your library" : "Removed from saved");
    qc.invalidateQueries({ queryKey: ["asset-details", id] });
    qc.invalidateQueries({ queryKey: ["saved-assets"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  }

  async function onShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: asset?.title, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm">
        Loading asset…
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="relative min-h-screen bg-background text-foreground">
        <AnimatedOrbs />
        <AppHeader />
        <main className="max-w-3xl mx-auto px-6 pt-32 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Asset not found</h1>
          <p className="text-muted-foreground mt-2">It may have been removed.</p>
          <Link to="/assets" className="mt-6 inline-flex h-10 px-5 rounded-xl bg-foreground text-background text-sm font-medium items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to vault
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <AnimatedOrbs />
      <div className="relative">
        <AppHeader />

        <main className="max-w-2xl mx-auto px-5 pt-24 pb-16">
          {/* Library back link */}
          <button
            onClick={() => navigate({ to: "/assets" })}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Library
          </button>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Big thumbnail card */}
            <div className="relative aspect-[16/10] rounded-3xl overflow-hidden ring-1 ring-border bg-gradient-to-br from-primary/30 to-accent/20">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={asset.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[8rem] font-semibold tracking-tighter text-foreground/20 select-none">
                    {asset.title.slice(0, 1).toUpperCase()}
                  </span>
                </div>
              )}
              {asset.premium_only && (
                <div className="absolute top-3 right-3 glass-strong rounded-full px-3 py-1 text-xs flex items-center gap-1.5">
                  {locked && <Lock className="h-3 w-3" />}
                  <Sparkles className="h-3 w-3 text-accent" /> Premium
                </div>
              )}
            </div>

            {/* Category */}
            <div className="mt-8 flex items-center gap-2 text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="text-accent capitalize">{asset.category}</span>
            </div>

            {/* Title */}
            <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-[-0.025em] leading-tight">
              {asset.title}
            </h1>

            {/* Description */}
            {asset.description && (
              <p className="mt-6 text-base text-muted-foreground leading-relaxed whitespace-pre-line">
                {asset.description}
              </p>
            )}

            {/* Tags */}
            {asset.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-1.5">
                {asset.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-elevated/70 text-muted-foreground"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Big download button */}
            <div className="mt-8 flex gap-2">
              <button
                onClick={onDownload}
                disabled={!!locked}
                className="flex-1 h-14 rounded-2xl text-base font-medium flex items-center justify-center gap-3 magnetic disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-primary to-accent text-primary-foreground glow-primary"
              >
                {locked ? (
                  <>
                    <Lock className="h-4 w-4" /> Unlock with Premium
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    Download · {formatSize(asset.size_bytes)}
                  </>
                )}
              </button>
              <button
                onClick={onSaveToggle}
                className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-colors ${
                  saved
                    ? "bg-accent/20 text-accent"
                    : "glass-strong text-muted-foreground hover:text-foreground"
                }`}
                aria-label={saved ? "Unsave" : "Save"}
              >
                {saved ? (
                  <BookmarkCheck className="h-5 w-5" />
                ) : (
                  <Bookmark className="h-5 w-5" />
                )}
              </button>
              <button
                onClick={onShare}
                className="h-14 w-14 rounded-2xl glass-strong flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Share"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>

            {/* Free plan footer */}
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Free plan: 3 downloads/day · Pro: unlimited
            </p>

            {locked && (
              <Link
                to="/billing"
                className="mt-4 block text-center text-sm text-accent hover:text-accent/80 transition-colors"
              >
                See pricing →
              </Link>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
