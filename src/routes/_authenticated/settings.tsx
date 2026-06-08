import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bell,
  CreditCard,
  Eye,
  Lock,
  LogOut,
  Mail,
  Palette,
  Save,
  Shield,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/preferences.functions";
import { updateProfile } from "@/lib/settings.functions";
import { AppHeader, AppHeaderLink } from "@/components/AppHeader";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { PremiumBadge } from "@/components/PremiumLock";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Zentry Qor" }] }),
  component: SettingsPage,
});

type LocalPrefs = {
  emailDigest: boolean;
  productUpdates: boolean;
  newAssetAlerts: boolean;
  reduceMotion: boolean;
  autoplayPreviews: boolean;
  compactMode: boolean;
};

const PREFS_KEY = "zentry:prefs";
const DEFAULT_PREFS: LocalPrefs = {
  emailDigest: true,
  productUpdates: true,
  newAssetAlerts: true,
  reduceMotion: false,
  autoplayPreviews: true,
  compactMode: false,
};

function loadPrefs(): LocalPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const fetchCtx = useServerFn(getMyContext);
  const saveProfile = useServerFn(updateProfile);
  const { data: ctx, isLoading } = useQuery({ queryKey: ["me"], queryFn: () => fetchCtx() });

  const [displayName, setDisplayName] = useState("");
  const [prefs, setPrefs] = useState<LocalPrefs>(DEFAULT_PREFS);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  useEffect(() => {
    if (ctx?.profile?.display_name) setDisplayName(ctx.profile.display_name);
  }, [ctx?.profile?.display_name]);

  function setPref<K extends keyof LocalPrefs>(key: K, value: LocalPrefs[K]) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    }
  }

  const profileMutation = useMutation({
    mutationFn: () => saveProfile({ data: { display_name: displayName.trim() } }),
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function changePassword() {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewPassword("");
    toast.success("Password updated");
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const isPremium = !!ctx?.isPremium;
  const firstName = ctx?.profile?.display_name?.split(" ")[0] ?? "creator";

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
        <AppHeader
          nav={
            <>
              <AppHeaderLink to="/dashboard">Dashboard</AppHeaderLink>
              <AppHeaderLink to="/assets">Assets</AppHeaderLink>
              <AppHeaderLink to="/saved">Saved</AppHeaderLink>
              <AppHeaderLink to="/ai">AI Studio</AppHeaderLink>
            </>
          }
          right={
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-semibold text-primary-foreground">
              {firstName[0]?.toUpperCase()}
            </div>
          }
        />

        <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-16">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Link>
          <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em]">Settings</h1>
              <p className="text-sm text-muted-foreground mt-2">Manage your profile, preferences, and account.</p>
            </div>
            {isPremium && <PremiumBadge />}
          </div>

          {isLoading || !ctx ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <div className="space-y-6">
              {/* Profile */}
              <Section icon={User} title="Profile" description="Your public identity on Zentry Qor.">
                <Field label="Display name">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={60}
                    className="w-full h-10 rounded-xl bg-elevated/60 border border-border/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={user?.email ?? ""}
                    disabled
                    className="w-full h-10 rounded-xl bg-elevated/30 border border-border/40 px-3 text-sm text-muted-foreground"
                  />
                </Field>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => profileMutation.mutate()}
                    disabled={profileMutation.isPending || !displayName.trim()}
                    className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-medium glow-primary inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {profileMutation.isPending ? "Saving…" : "Save profile"}
                  </button>
                </div>
              </Section>

              {/* Notifications */}
              <Section icon={Bell} title="Notifications" description="Choose what we email you about.">
                <Toggle
                  icon={Mail}
                  label="Weekly creator digest"
                  description="Top assets and tools curated for your niche."
                  checked={prefs.emailDigest}
                  onChange={(v) => setPref("emailDigest", v)}
                />
                <Toggle
                  icon={Sparkles}
                  label="Product updates"
                  description="New features, AI tools, and releases."
                  checked={prefs.productUpdates}
                  onChange={(v) => setPref("productUpdates", v)}
                />
                <Toggle
                  icon={Bell}
                  label="New asset alerts"
                  description="Get notified when a pack matching your interests drops."
                  checked={prefs.newAssetAlerts}
                  onChange={(v) => setPref("newAssetAlerts", v)}
                />
              </Section>

              {/* Appearance */}
              <Section icon={Palette} title="Appearance" description="Tune motion and density to your taste.">
                <Toggle
                  icon={Eye}
                  label="Reduce motion"
                  description="Minimize background animations and orb effects."
                  checked={prefs.reduceMotion}
                  onChange={(v) => setPref("reduceMotion", v)}
                />
                <Toggle
                  icon={Sparkles}
                  label="Autoplay previews"
                  description="Auto-play videos and hover previews on cards."
                  checked={prefs.autoplayPreviews}
                  onChange={(v) => setPref("autoplayPreviews", v)}
                />
                <Toggle
                  icon={Palette}
                  label="Compact mode"
                  description="Tighter spacing in lists and the vault."
                  checked={prefs.compactMode}
                  onChange={(v) => setPref("compactMode", v)}
                />
              </Section>

              {/* Security */}
              <Section icon={Shield} title="Security" description="Keep your account safe.">
                <Field label="New password">
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="flex-1 h-10 rounded-xl bg-elevated/60 border border-border/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <button
                      onClick={changePassword}
                      disabled={savingPassword || newPassword.length < 8}
                      className="h-10 px-4 rounded-xl glass text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      {savingPassword ? "Updating…" : "Update"}
                    </button>
                  </div>
                </Field>
              </Section>

              {/* Billing */}
              <Section icon={CreditCard} title="Billing" description="Manage subscription and payment method.">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-elevated/60 p-4">
                  <div>
                    <div className="text-sm font-semibold">
                      {isPremium ? "Premium plan" : "Free plan"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {isPremium ? "Thanks for supporting Zentry Qor." : "Upgrade to unlock the full vault."}
                    </div>
                  </div>
                  <Link
                    to="/billing"
                    className="h-9 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-medium inline-flex items-center gap-2"
                  >
                    {isPremium ? "Manage" : "Upgrade"}
                  </Link>
                </div>
              </Section>

              {/* Danger / session */}
              <Section icon={Trash2} title="Account" description="Sign out of this device or contact support to delete your account.">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={signOut}
                    className="h-10 px-4 rounded-xl glass text-sm font-medium inline-flex items-center gap-2"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </button>
                  <a
                    href="mailto:zentryqor@gmail.com?subject=Delete%20my%20account"
                    className="h-10 px-4 rounded-xl border border-destructive/40 text-destructive text-sm font-medium inline-flex items-center gap-2 hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Request account deletion
                  </a>
                </div>
              </Section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl glass-strong border border-border/60 p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="h-9 w-9 rounded-xl bg-elevated/60 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-elevated/40 p-3">
      <div className="h-8 w-8 rounded-lg bg-elevated/80 flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition shrink-0 ${
          checked ? "bg-gradient-to-r from-primary to-accent" : "bg-foreground/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
