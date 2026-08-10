import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { getReferrerByCode } from "@/lib/referrals.functions";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Gift, Sparkles } from "lucide-react";
import authLogo from "@/assets/zentry-auth-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { redirect?: string; ref?: string; invited?: 1 } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    ref: typeof search.ref === "string" ? search.ref : undefined,
    invited:
      search.invited === 1 || search.invited === "1" || search.invited === true
        ? 1
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Log in — Zentry Qor" },
      { name: "description", content: "Log in to your Zentry Qor creator vault to access your assets, AI tools, and workspace." },
      { property: "og:title", content: "Log in — Zentry Qor" },
      { property: "og:description", content: "Log in to your Zentry Qor creator vault to access your assets, AI tools, and workspace." },
      { property: "og:url", content: "https://zentryqor.lovable.app/auth" },
    ],
    links: [{ rel: "canonical", href: "https://zentryqor.lovable.app/auth" }],
  }),
  component: AuthPage,
});

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return { score: Math.min(4, score) };
}

function AuthPage() {
  const { redirect: redirectTo, ref: refCode, invited } = Route.useSearch();
  const isInvited = invited === 1 && !!refCode;
  const [mode, setMode] = useState<"signin" | "signup">(isInvited ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [inviterName, setInviterName] = useState<string | null>(null);

  const navigate = useNavigate();
  const router = useRouter();
  const dest = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard";
  const fetchReferrer = useServerFn(getReferrerByCode);

  useEffect(() => {
    // Stash referral code so the SIGNED_IN listener can apply it after signup.
    if (isInvited && refCode && typeof window !== "undefined") {
      try {
        window.localStorage.setItem("zq_ref_code", refCode.toUpperCase());
      } catch {}
      fetchReferrer({ data: { code: refCode } })
        .then((r) => setInviterName(r.displayName))
        .catch(() => setInviterName("A friend"));
    }
  }, [isInvited, refCode, fetchReferrer]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: dest });
    });
  }, [navigate, dest]);


  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${dest}`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        if (!data.session) {
          // Fall back to explicit sign-in in case email confirmation is enforced.
          const { error: siErr } = await supabase.auth.signInWithPassword({ email, password });
          if (siErr) throw siErr;
        }
        toast.success("Welcome to Zentry Qor!");
        await router.invalidate();
        navigate({ to: dest });
      } else {
        const res = await fetch("/api/public/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            payload?.error ||
            (res.status === 401
              ? "Incorrect email or password."
              : "Log in failed. Please try again.");
          throw new Error(msg);
        }
        const { error: setErr } = await supabase.auth.setSession({
          access_token: payload.access_token,
          refresh_token: payload.refresh_token,
        });
        if (setErr) throw setErr;
        await router.invalidate();
        navigate({ to: dest });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const isSignin = mode === "signin";

  const strength = getPasswordStrength(password);
  const strengthLabel = ["Too short", "Weak", "Fair", "Good", "Strong"][strength.score];
  const strengthColor = [
    "bg-destructive",
    "bg-destructive",
    "bg-accent",
    "bg-success",
    "bg-success",
  ][strength.score];

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-foreground/5 text-foreground px-5 py-10 relative overflow-hidden">
      <div className="fixed -top-24 -right-24 w-80 h-80 rounded-full bg-accent/15 blur-[110px] pointer-events-none" />
      <div className="fixed -bottom-24 -left-24 w-96 h-96 rounded-full bg-primary/20 blur-[130px] pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-foreground/25 to-transparent top-1/4 animate-pulse" />
        <div className="absolute w-px h-full bg-gradient-to-b from-transparent via-foreground/10 to-transparent left-1/4" />
      </div>

      <div className="relative w-full max-w-[380px] z-10">
        {/* Brand */}
        <div className="mb-8 text-center">
          <Link
            to="/"
            className="inline-block mb-4"
            aria-label="Back to home"
          >
            <img
              src={authLogo.url}
              alt="Zentry Qor logo"
              className="h-20 w-20 mx-auto drop-shadow-[0_10px_30px_rgba(59,130,246,0.35)]"
            />
          </Link>
          <h1 className="text-3xl font-bold tracking-tighter uppercase text-gradient">
            Zentry Qor
          </h1>
          <p className="text-[11px] tracking-[0.22em] text-muted-foreground uppercase font-medium mt-1">
            Creator Workspace Access
          </p>
        </div>

        <div className="space-y-5">
          {isInvited ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 animate-enter">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    <span className="text-aurora">{inviterName ?? "A friend"}</span> invited you
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Sparkles className="w-3 h-3 text-accent" />
                    Create your account to claim 30 bonus AI credits
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setMode("signin");
                }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-2xl transition-all duration-300 ${
                  isSignin
                    ? "text-foreground bg-white/10 border border-white/10 shadow-lg"
                    : "text-muted-foreground hover:text-foreground/70"
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setMode("signup");
                }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-2xl transition-all duration-300 ${
                  !isSignin
                    ? "text-foreground bg-white/10 border border-white/10 shadow-lg"
                    : "text-muted-foreground hover:text-foreground/70"
                }`}
              >
                Create Account
              </button>
            </div>
          )}


          {formError && (
            <div
              role="alert"
              className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive animate-enter"
            >
              {formError}
            </div>
          )}

          <form onSubmit={handleEmail} className="space-y-4">
            <div
              className={`transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${
                isSignin ? "max-h-0 opacity-0" : "max-h-32 opacity-100"
              }`}
            >
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground ml-1 font-bold">
                  Creator name
                </label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isSignin}
                  maxLength={60}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 px-5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/30 focus:border-foreground/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground ml-1 font-bold">
                Email
              </label>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 px-5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/30 focus:border-foreground/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  Security
                </label>
                {isSignin && (
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
                    6+ chars
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  maxLength={72}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 pl-5 pr-12 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/30 focus:border-foreground/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground/60 hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {!isSignin && (
                <div className="animate-enter">
                  <div className="flex items-center gap-2 ml-1">
                    <div className="flex-1 flex gap-1 h-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-all duration-300 ${
                            i < strength.score ? strengthColor : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground min-w-[50px] text-right">
                      {strengthLabel}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full mt-2 bg-foreground text-background py-4 rounded-2xl font-bold text-sm uppercase tracking-wider disabled:opacity-60 disabled:cursor-not-allowed hover:bg-foreground/90 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSignin ? "Log In" : "Create Account"}
            </button>
          </form>

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
              <span className="px-3 bg-foreground/5 text-muted-foreground/60 font-bold">
                Rapid Access
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              const result = await lovable.auth.signInWithOAuth("google", {
                redirect_uri: `${window.location.origin}${dest}`,
              });
              if (result.error) {
                toast.error("Google sign-in failed");
                setLoading(false);
                return;
              }
              if (result.redirected) return;
              await router.invalidate();
              navigate({ to: dest });
            }}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white/[0.04] border border-white/10 rounded-2xl py-3.5 hover:bg-white/[0.08] transition-colors disabled:opacity-50 text-sm font-medium text-foreground"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </div>

        <p className="mt-7 text-center text-[10px] text-muted-foreground/50 uppercase tracking-[0.28em] font-medium">
          Need assistance?{" "}
          <Link
            to="/contact"
            className="text-muted-foreground hover:text-foreground transition-colors underline decoration-white/10 underline-offset-4"
          >
            Contact HQ
          </Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
