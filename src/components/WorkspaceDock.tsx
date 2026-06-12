import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Boxes, LayoutDashboard, Settings, WandSparkles } from "lucide-react";

const destinations = [
  { to: "/dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { to: "/ai" as const, label: "AI Studio", icon: WandSparkles },
  { to: "/assets" as const, label: "Assets", icon: Boxes },
  { to: "/settings" as const, label: "Settings", icon: Settings },
];

export function WorkspaceDock() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <motion.nav
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Workspace navigation"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto w-auto max-w-2xl sm:inset-x-6 sm:bottom-6"
    >
      <div className="glass-strong grid grid-cols-4 items-center gap-1 rounded-2xl border border-border/60 p-1.5 shadow-2xl backdrop-blur-2xl sm:gap-2 sm:p-2">
        {destinations.map((destination) => {
          const Icon = destination.icon;
          const isActive = pathname === destination.to;

          return (
            <Link
              key={destination.to}
              to={destination.to}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-medium transition-colors sm:px-5 sm:text-sm ${
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="workspace-dock-active"
                  className="absolute inset-0 rounded-xl bg-elevated shadow-sm"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative z-10 flex min-w-0 items-center justify-center">
                <Icon className="h-5 w-5 shrink-0" />
              </span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}