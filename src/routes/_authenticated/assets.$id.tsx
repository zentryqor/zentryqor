import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Calendar,
  Download,
  FileType,
  Hash,
  HardDrive,
  Lock,
  Share2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { AppHeader, AppHeaderLink } from "@/components/AppHeader";
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
    if (navigator.share) {
      try { await navigator.share({ title: asset?.title, url }); } catch {}
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
        <AppHeader
          nav={
            <>
              <AppHeaderLink to="/dashboard">Dashboard</AppHeaderLink>
              <AppHeaderLink to="/assets" active>Vault</AppHeaderLink>
              <AppHeaderLink to="/saved">Saved</AppHeaderLink>
              <AppHeaderLink to="/ai">AI Studio</AppHeaderLink>
            </>
          }
        />

        <main className="max-w-5xl mx-auto px-6 pt-28 pb-16">
          <button
            onClick={() => navigate({ to: "/assets" })}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to vault
          </button>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="grid lg:grid-cols-5 gap-8"
          >
            {/* Preview */}
            <div className="lg:col-span-3">
              <div className="relative aspect-[16/10] rounded-3xl bg-gradient-to-br from-primary/40 to-accent/20 overflow-hidden ring-1 ring-border">
                <div className="absolute inset-0 ring-grid opacity-30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10rem] font-semibold tracking-tighter text-foreground/20 select-none">
                    {asset.title.slice(0, 1).toUpperCase()}
                  </span>
                </div>
                {asset.premium_only && (
                  <div className="absolute top-4 right-4 glass-strong rounded-full px-3 py-1 text-xs flex items-center gap-1.5">
                    {locked && <Lock className="h-3 w-3" />}
                    <Sparkles className="h-3 w-3 text-accent" /> Premium
                  </div>
                )}
              </div>
            </div>

            {/* Meta + actions */}
            <div className="lg:col-span-2 flex flex-col">
              <div className="text-[11px] uppercase tracking-[0.2em] text-accent">{asset.category}</div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em] mt-2 leading-tight">
                {asset.title}
              </h1>
              {asset.description && (
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                  {asset.description}
                </p>
              )}

              {asset.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {asset.tags.map((t) => (
                    <span key={t} className="text-[10px] px-2 py-1 rounded-full bg-elevated/70 text-muted-foreground flex items-center gap-1">
                      <Hash className="h-2.5 w-2.5" /> {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-6 flex gap-2">
                <button
                  onClick={onDownload}
                  disabled={!!locked}
                  className="flex-1 h-11 rounded-xl text-sm font-medium flex items-center justify-center gap-2 magnetic disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-primary to-accent text-primary-foreground glow-primary"
                >
                  {locked ? <><Lock className="h-4 w-4" /> Unlock with Premium</> : <><Download className="h-4 w-4" /> Download</>}
                </button>
                <button
                  onClick={onSaveToggle}
                  className={`h-11 w-11 rounded-xl flex items-center justify-center transition-colors ${
                    saved ? "bg-accent/20 text-accent" : "glass-strong text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label={saved ? "Unsave" : "Save"}
                >
                  {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                </button>
                <button
                  onClick={onShare}
                  className="h-11 w-11 rounded-xl glass-strong flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Share"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>

              {locked && (
                <Link
                  to="/billing"
                  className="mt-3 text-xs text-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  See pricing →
                </Link>
              )}

              {/* Specs */}
              <div className="mt-6 glass rounded-2xl divide-y divide-border/40">
                <Spec icon={<FileType className="h-3.5 w-3.5" />} label="Type" value={asset.mime_type ?? "—"} />
                <Spec
                  icon={<HardDrive className="h-3.5 w-3.5" />}
                  label="Size"
                  value={asset.size_bytes ? `${(asset.size_bytes / 1024).toFixed(1)} KB` : "—"}
                />
                <Spec
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  label="Added"
                  value={new Date(asset.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                />
                <Spec
                  icon={<Download className="h-3.5 w-3.5" />}
                  label="Your downloads"
                  value={`${data?.downloadCount ?? 0}`}
                />
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}

function Spec({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-xs">
      <span className="flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
        <span className="text-accent">{icon}</span> {label}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
