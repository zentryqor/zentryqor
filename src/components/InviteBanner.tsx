import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Gift, ArrowRight, Sparkles, X } from "lucide-react";
import { getReferrerByCode } from "@/lib/referrals.functions";
import { useAuth } from "@/hooks/use-auth";

export function InviteBanner() {
  const [code, setCode] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const fetchReferrer = useServerFn(getReferrerByCode);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && /^[A-Za-z0-9]{4,32}$/.test(ref)) {
      const upper = ref.toUpperCase();
      setCode(upper);
      fetchReferrer({ data: { code: upper } })
        .then((r) => setName(r.displayName))
        .catch(() => setName("A friend"));
    }
  }, [fetchReferrer]);

  if (!code || dismissed || loading || user) return null;

  const displayName = name ?? "A friend";

  return (
    <div className="fixed top-0 inset-x-0 z-[60] px-3 pt-3 pointer-events-none">
      <div className="pointer-events-auto max-w-3xl mx-auto glass-strong rounded-2xl border border-white/10 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 sm:p-4">
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">
                <span className="text-aurora">{displayName}</span> invited you to Zentry Qor
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3 text-accent" />
                Get 30 bonus AI credits when you create your account
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              to="/auth"
              search={{ ref: code, invited: 1, redirect: undefined as unknown as string | undefined }}
              className="group inline-flex items-center justify-center gap-1.5 flex-1 sm:flex-initial h-10 px-4 rounded-xl bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors"
            >
              Get started
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <button
              onClick={() => setDismissed(true)}
              aria-label="Dismiss"
              className="h-10 w-10 rounded-xl glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
