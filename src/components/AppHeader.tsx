import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import logoAsset from "@/assets/zentry-logo.png.asset.json";

export function AppHeader({
  nav,
  right,
}: {
  nav?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="fixed top-0 inset-x-0 z-50 flex justify-center px-4 pt-4">
      <nav className="glass-strong w-full max-w-6xl rounded-2xl px-3 sm:px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1.5 sm:gap-2 group shrink-0 min-w-0">
          <div className="relative h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center shrink-0">
            <img
              src={logoAsset.url}
              alt="Zentry Qor logo"
              className="h-7 w-7 sm:h-8 sm:w-8 object-contain drop-shadow-[0_0_12px_oklch(0.65_0.2_250/0.45)]"
            />
          </div>
          <span className="font-semibold tracking-tight text-sm sm:text-[15px] truncate">
            Zentry <span className="text-muted-foreground font-medium">Qor</span>
          </span>
        </Link>

        {nav && (
          <div className="hidden md:flex items-center gap-1 text-sm">{nav}</div>
        )}

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">{right}</div>
      </nav>
    </header>
  );
}

export function AppHeaderLink({
  to,
  active,
  children,
}: {
  to: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className={
        active
          ? "px-3 py-1.5 rounded-full bg-elevated text-foreground transition-colors"
          : "px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
      }
    >
      {children}
    </Link>
  );
}
