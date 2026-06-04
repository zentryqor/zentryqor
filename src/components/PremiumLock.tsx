import { Lock, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function PremiumBadge() {
  return (
    <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 text-accent">
      <Sparkles className="h-2.5 w-2.5" /> Premium
    </div>
  );
}

export function PremiumLockOverlay({ label = "Premium" }: { label?: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-background/70 backdrop-blur-md">
      <div className="h-10 w-10 rounded-full glass-strong flex items-center justify-center">
        <Lock className="h-4 w-4" />
      </div>
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label} — Premium</div>
      <Link
        to="/billing"
        className="h-9 px-4 rounded-full bg-foreground text-background text-xs font-medium magnetic"
      >
        Unlock for $12.99/mo
      </Link>
    </div>
  );
}

export function LockedCard({
  children,
  isPremium,
  label,
}: {
  children: React.ReactNode;
  isPremium: boolean;
  label?: string;
}) {
  return (
    <div className="relative">
      <div className={isPremium ? "" : "pointer-events-none select-none"}>{children}</div>
      {!isPremium && <PremiumLockOverlay label={label} />}
    </div>
  );
}
