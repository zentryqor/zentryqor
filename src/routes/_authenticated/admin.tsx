import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Database,
  Download,
  Loader2,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { AppHeader, AppHeaderLink } from "@/components/AppHeader";
import {
  adminDeleteAsset,
  adminGetAssetSignedUrl,
  adminInsertAssetRow,
  adminListAccounts,
  adminListAssets,
  checkIsAdmin,
  type AdminAccount,
  type AdminAssetRow,
} from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Zentry Qor" }] }),
  beforeLoad: async () => {
    try {
      const { isAdmin } = await checkIsAdmin();
      if (!isAdmin) throw redirect({ to: "/dashboard" });
    } catch (err) {
      if (err && typeof err === "object" && "to" in (err as object)) throw err;
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminPage,
});

type Account = AdminAccount;
type AssetRow = AdminAssetRow;

function AdminPage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [tagsInput, setTagsInput] = useState("");
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [accs, assetRows] = await Promise.all([
        adminListAccounts(),
        adminListAssets(),
      ]);
      setAccounts(accs);
      setAssets(assetRows);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to load");
      if (err?.message === "Forbidden") navigate({ to: "/dashboard" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!file || !title.trim()) {
      toast.error("Title and file required");
      return;
    }
    setUploading(true);
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const fd = new FormData();
      fd.append("file", file);
      if (thumbnail) fd.append("thumbnail", thumbnail);
      fd.append(
        "meta",
        JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          category: category.trim() || "general",
          tags,
          premium_only: premiumOnly,
          file_name: file.name,
          mime_type: file.type || null,
        }),
      );
      await adminUploadAsset({ data: fd });

      toast.success("Asset uploaded");
      setTitle("");
      setDescription("");
      setCategory("general");
      setTagsInput("");
      setPremiumOnly(false);
      setFile(null);
      setThumbnail(null);
      const el = document.getElementById("file-input") as HTMLInputElement | null;
      if (el) el.value = "";
      const thumbEl = document.getElementById("thumb-input") as HTMLInputElement | null;
      if (thumbEl) thumbEl.value = "";
      loadAll();
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (a: AssetRow) => {
    if (!confirm(`Delete "${a.title}"?`)) return;
    try {
      await adminDeleteAsset({ data: { id: a.id } });
      toast.success("Deleted");
      loadAll();
    } catch (err: any) {
      toast.error(err.message ?? "Delete failed");
    }
  };

  const downloadAsset = async (a: AssetRow) => {
    try {
      const { url } = await adminGetAssetSignedUrl({ data: { id: a.id } });
      window.open(url, "_blank");
    } catch (err: any) {
      toast.error(err.message ?? "Could not download");
    }
  };



  const premiumCount = assets.filter((a) => a.premium_only).length;
  const subscribed = accounts.filter((a) => a.subscription_status === "active").length;

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
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
        <AppHeader
          nav={
            <>
              <AppHeaderLink to="/dashboard">Dashboard</AppHeaderLink>
              <AppHeaderLink to="/assets">Vault</AppHeaderLink>
              <span className="px-3 py-1.5 rounded-full bg-elevated text-foreground flex items-center gap-1.5">
                <Shield className="h-3 w-3 text-accent" /> Admin
              </span>
            </>
          }
          right={
            <Link
              to="/assets"
              className="hidden sm:inline-flex h-8 sm:h-9 px-3 rounded-full glass items-center gap-1.5 text-xs font-medium"
            >
              View vault <ArrowUpRight className="h-3 w-3 icon-fx" />
            </Link>
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
              <Shield className="h-3 w-3 text-accent" /> Operator console
            </div>
            <h1 className="text-4xl sm:text-6xl font-semibold tracking-[-0.03em] leading-[1.05]">
              The <span className="text-gradient-brand">control deck.</span>
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Manage accounts, upload drops, and curate the vault.
            </p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            <StatCard icon={<Users className="h-4 w-4" />} label="Accounts" value={accounts.length} />
            <StatCard icon={<Sparkles className="h-4 w-4 icon-fx" />} label="Active subs" value={subscribed} accent />
            <StatCard icon={<Database className="h-4 w-4" />} label="Assets" value={assets.length} />
            <StatCard icon={<Sparkles className="h-4 w-4 icon-fx" />} label="Premium" value={premiumCount} accent />
          </div>

          {/* Upload */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass rounded-3xl p-6 sm:p-8 mb-8"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground mb-5">
              <Upload className="h-4 w-4 text-accent" /> Upload new asset
            </div>
            <form onSubmit={handleUpload} noValidate className="grid gap-4 md:grid-cols-2">
              <Field label="Title">
                <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} />
              </Field>
              <Field label="Category">
                <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="templates, guides, audio" className={inputCls} />
              </Field>
              <Field label="Description" className="md:col-span-2">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${inputCls} h-auto py-3 resize-none`} />
              </Field>
              <Field label="Tags (comma separated)">
                <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="vault, premium, starter" className={inputCls} />
              </Field>
              <Field label="File">
                <input id="file-input" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required
                  className="w-full h-11 px-3 rounded-xl bg-background/40 border border-border/60 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-elevated file:text-foreground file:text-xs" />
              </Field>
              <Field label="Thumbnail (optional, image)">
                <input id="thumb-input" type="file" accept="image/*" onChange={(e) => setThumbnail(e.target.files?.[0] ?? null)}
                  className="w-full h-11 px-3 rounded-xl bg-background/40 border border-border/60 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-elevated file:text-foreground file:text-xs" />
              </Field>
              <div className="flex items-center justify-between md:col-span-2 p-4 rounded-2xl glass-strong">
                <div>
                  <div className="text-sm font-medium">Premium only</div>
                  <div className="text-xs text-muted-foreground">Locked to subscribed users.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setPremiumOnly(!premiumOnly)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${premiumOnly ? "bg-gradient-to-r from-primary to-accent" : "bg-elevated"}`}
                >
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-background shadow-md transition-all ${premiumOnly ? "left-6" : "left-1"}`} />
                </button>
              </div>
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={(e) => handleUpload(e)}
                  disabled={uploading}
                  className="h-11 px-6 rounded-xl bg-foreground text-background text-sm font-medium magnetic glow-primary disabled:opacity-60 flex items-center gap-2"
                >
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Upload className="h-3.5 w-3.5" /> Upload asset
                </button>
              </div>
            </form>
          </motion.section>

          {/* Accounts */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="glass rounded-3xl p-6 sm:p-8 mb-8"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <Users className="h-4 w-4 text-accent" /> Accounts
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{accounts.length}</span>
            </div>
            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground text-left">
                      <th className="py-3 font-normal">Name</th>
                      <th className="py-3 font-normal">Email</th>
                      <th className="py-3 font-normal">Roles</th>
                      <th className="py-3 font-normal">Subscription</th>
                      <th className="py-3 font-normal">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((a) => (
                      <tr key={a.id} className="border-t border-border/40 hover:bg-elevated/40 transition-colors">
                        <td className="py-3">{a.display_name ?? <span className="text-muted-foreground">—</span>}</td>
                        <td className="py-3 font-mono text-xs text-muted-foreground">{a.email}</td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1">
                            {a.roles.length ? a.roles.map((r) => (
                              <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-elevated/70 text-foreground">
                                {r}
                              </span>
                            )) : <span className="text-muted-foreground">—</span>}
                          </div>
                        </td>
                        <td className="py-3">
                          {a.subscription_status ? (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.subscription_status === "active" ? "bg-primary/20 text-accent" : "bg-elevated/70 text-muted-foreground"}`}>
                              {a.subscription_status}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">
                          {new Date(a.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.section>

          {/* Assets */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="glass rounded-3xl p-6 sm:p-8"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <Database className="h-4 w-4 text-accent" /> Uploaded assets
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{assets.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground text-left">
                    <th className="py-3 font-normal">Title</th>
                    <th className="py-3 font-normal">Category</th>
                    <th className="py-3 font-normal">Tags</th>
                    <th className="py-3 font-normal">Size</th>
                    <th className="py-3 font-normal">Tier</th>
                    <th className="py-3 font-normal text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a) => (
                    <tr key={a.id} className="border-t border-border/40 hover:bg-elevated/40 transition-colors">
                      <td className="py-3 font-medium">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-14 rounded-md overflow-hidden bg-elevated/60 ring-1 ring-border/60 flex items-center justify-center shrink-0">
                            {a.thumbnail_url ? (
                              <img src={a.thumbnail_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-xs text-muted-foreground">{a.title.slice(0, 1).toUpperCase()}</span>
                            )}
                          </div>
                          <span>{a.title}</span>
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground">{a.category}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {a.tags.map((t) => (
                            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-elevated/70 text-muted-foreground">{t}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">
                        {a.size_bytes ? `${(a.size_bytes / 1024).toFixed(1)} KB` : "—"}
                      </td>
                      <td className="py-3">
                        {a.premium_only ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-accent">Premium</span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-elevated/70 text-muted-foreground">Free</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => downloadAsset(a)} className="h-8 w-8 rounded-full hover:bg-elevated flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(a)} className="h-8 w-8 rounded-full hover:bg-destructive/20 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>
        </main>
      </div>
    </div>
  );
}

const inputCls = "w-full h-11 px-4 rounded-xl bg-background/40 border border-border/60 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition";

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: boolean }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="text-accent">{icon}</span> {label}
      </div>
      <div className={`mt-2 text-3xl font-semibold tracking-tight tabular-nums ${accent ? "text-gradient-brand" : ""}`}>
        {value}
      </div>
    </div>
  );
}
