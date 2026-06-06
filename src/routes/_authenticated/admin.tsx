import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
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

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Zentry Qor" }] }),
  component: AdminPage,
});

type Account = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  roles: string[];
  subscription_status: string | null;
};

type AssetRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  file_name: string;
  storage_path: string;
  size_bytes: number | null;
  premium_only: boolean;
  created_at: string;
};

function AdminPage() {
  const navigate = useNavigate();
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
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

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        navigate({ to: "/auth" });
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      const admin = (roles ?? []).some((r) => r.role === "admin");
      setIsAdmin(admin);
      setCheckingAdmin(false);
      if (!admin) navigate({ to: "/dashboard" });
    })();
  }, [navigate]);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: subs }, { data: assetRows }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, display_name, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("subscriptions").select("user_id, status, current_period_end"),
        supabase.from("assets").select("*").order("created_at", { ascending: false }),
      ]);

    const accs: Account[] = (profiles ?? []).map((p: any) => ({
      id: p.id,
      email: p.email,
      display_name: p.display_name,
      created_at: p.created_at,
      roles: (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
      subscription_status:
        (subs ?? []).find((s: any) => s.user_id === p.id)?.status ?? null,
    }));
    setAccounts(accs);
    setAssets((assetRows ?? []) as AssetRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) {
      toast.error("Title and file required");
      return;
    }
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user!.id;
      const path = `${uid}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const { error: upErr } = await supabase.storage
        .from("assets")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

      const { error: insErr } = await supabase.from("assets").insert({
        title: title.trim(),
        description: description.trim() || null,
        category: category.trim() || "general",
        tags,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        premium_only: premiumOnly,
        uploaded_by: uid,
      });
      if (insErr) throw insErr;

      toast.success("Asset uploaded");
      setTitle("");
      setDescription("");
      setCategory("general");
      setTagsInput("");
      setPremiumOnly(false);
      setFile(null);
      const el = document.getElementById("file-input") as HTMLInputElement | null;
      if (el) el.value = "";
      loadAll();
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (a: AssetRow) => {
    if (!confirm(`Delete "${a.title}"?`)) return;
    await supabase.storage.from("assets").remove([a.storage_path]);
    const { error } = await supabase.from("assets").delete().eq("id", a.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    loadAll();
  };

  const downloadAsset = async (a: AssetRow) => {
    const { data, error } = await supabase.storage
      .from("assets")
      .createSignedUrl(a.storage_path, 60);
    if (error || !data) {
      toast.error(error?.message ?? "Could not download");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  if (checkingAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isAdmin) return null;

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
              View vault <ArrowUpRight className="h-3 w-3" />
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
            <StatCard icon={<Sparkles className="h-4 w-4" />} label="Active subs" value={subscribed} accent />
            <StatCard icon={<Database className="h-4 w-4" />} label="Assets" value={assets.length} />
            <StatCard icon={<Sparkles className="h-4 w-4" />} label="Premium" value={premiumCount} accent />
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
            <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
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
                  type="submit"
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
                      <td className="py-3 font-medium">{a.title}</td>
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
