import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  WandSparkles,
  Calendar,
  Boxes,
  Bookmark,
  Sparkles,
  CreditCard,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { ProfileMenu } from "@/components/ProfileMenu";
import logoAsset from "@/assets/zentry-logo.png.asset.json";

type NavItem = {
  to: "/dashboard" | "/ai" | "/poster" | "/assets" | "/saved" | "/library" | "/billing";
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  match?: (path: string) => boolean;
};

const PRIMARY: NavItem[] = [
  { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
  { to: "/ai", label: "ai-studio", icon: WandSparkles },
  { to: "/poster", label: "poster", icon: Calendar, match: (p) => p.startsWith("/poster") },
  { to: "/assets", label: "vault", icon: Boxes, match: (p) => p.startsWith("/assets") },
];

const SECONDARY: NavItem[] = [
  { to: "/saved", label: "saved", icon: Bookmark },
  { to: "/library", label: "library", icon: BookOpen },
  { to: "/billing", label: "billing", icon: CreditCard },
];

export function WorkspaceShell({
  path,
  title,
  actions,
  meta,
  isPremium,
  children,
}: {
  /** breadcrumb path segments, e.g. ["ai-studio"] or ["poster", "youtube"] */
  path: string[];
  title?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  isPremium?: boolean;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = item.match ? item.match(pathname) : pathname === item.to;
    return (
      <Link
        key={item.to}
        to={item.to}
        className={`group flex items-center gap-2.5 h-8 px-2.5 rounded-md text-[13px] transition-colors ${
          active
            ? "bg-elevated/70 text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-elevated/40"
        }`}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        <span className="font-mono-display truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Left sidebar (desktop) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-56 flex-col hairline-r bg-background">
        <Link to="/" className="flex items-center gap-2 h-14 px-4 hairline-b shrink-0">
          <img src={logoAsset.url} alt="" className="h-6 w-6" />
          <span className="font-mono-display text-[13px] tracking-tight">
            zentry<span className="text-muted-foreground">/qor</span>
          </span>
        </Link>

        <nav className="flex-1 overflow-y-auto px-2 py-4 flex flex-col gap-4">
          <div>
            <div className="px-2.5 pb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-mono-display">
              workspace
            </div>
            <div className="flex flex-col gap-0.5">{PRIMARY.map(renderItem)}</div>
          </div>
          <div>
            <div className="px-2.5 pb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-mono-display">
              account
            </div>
            <div className="flex flex-col gap-0.5">{SECONDARY.map(renderItem)}</div>
          </div>
        </nav>

        <div className="p-3 hairline-t">
          {!isPremium && (
            <Link
              to="/billing"
              className="mb-2 flex items-center justify-between gap-2 rounded-md border border-accent/40 bg-accent/[0.06] px-2.5 py-2 text-[11px] font-mono-display text-accent hover:bg-accent/10 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" strokeWidth={2} /> upgrade
              </span>
              <span className="text-[10px] text-accent/70">$12.99/mo</span>
            </Link>
          )}
          <div className="flex items-center justify-between">
            <ProfileMenu />
            <div className="text-[10px] text-muted-foreground/60 font-mono-display">v1.0</div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 h-12 hairline-b bg-background/95 backdrop-blur flex items-center justify-between px-3">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoAsset.url} alt="" className="h-5 w-5" />
          <span className="font-mono-display text-xs">zentry/qor</span>
        </Link>
        <ProfileMenu />
      </div>

      {/* Main content */}
      <div className="lg:pl-56 pt-12 lg:pt-0 pb-28 lg:pb-6">
        {/* Sticky header strip */}
        <header className="sticky top-12 lg:top-0 z-30 hairline-b bg-background/95 backdrop-blur">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 font-mono-display text-[12px] text-muted-foreground">
              <span>~</span>
              {path.map((seg, i) => (
                <span key={i} className="flex items-center gap-2 min-w-0">
                  <ChevronRight className="h-3 w-3 opacity-40" strokeWidth={1.5} />
                  <span className={i === path.length - 1 ? "text-foreground truncate" : "truncate"}>{seg}</span>
                </span>
              ))}
              {meta && <span className="hidden sm:inline-flex items-center gap-2 ml-3 pl-3 hairline-l border-l border-border/60 text-[11px]">{meta}</span>}
            </div>
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          </div>
          {title && (
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-3 -mt-0.5">
              <h1 className="text-xl sm:text-2xl font-mono-display tracking-tight">{title}</h1>
            </div>
          )}
        </header>

        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 hairline-t bg-background/95 backdrop-blur">
        <div className="grid grid-cols-4">
          {PRIMARY.map((item) => {
            const Icon = item.icon;
            const active = item.match ? item.match(pathname) : pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-mono-display transition-colors ${
                  active ? "text-accent" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/** Compact stat cell for cockpit-style rows. */
export function StatCell({
  label,
  value,
  unit,
  delta,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  delta?: number;
  hint?: React.ReactNode;
}) {
  return (
    <div className="p-4 sm:p-5 min-w-0">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono-display">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-mono-display text-2xl sm:text-3xl tracking-tight tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-[11px] text-muted-foreground font-mono-display">{unit}</span>
        )}
      </div>
      {typeof delta === "number" && (
        <div
          className={`mt-1 text-[11px] font-mono-display tabular-nums ${
            delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {delta > 0 ? "+" : ""}
          {delta}% / 7d
        </div>
      )}
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** Section header with terminal-style path label. */
export function SectionLabel({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3 mt-2">
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-mono-display flex items-center gap-2">
        <span className="text-accent">$</span> {children}
      </div>
      {right && <div className="text-[11px] text-muted-foreground">{right}</div>}
    </div>
  );
}
