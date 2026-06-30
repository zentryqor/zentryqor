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
    <nav
      aria-label="Workspace navigation"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto w-auto max-w-2xl sm:inset-x-6 sm:bottom-6"
    >
      <div className="grid grid-cols-4 items-stretch rounded-[2rem] border border-border/40 bg-elevated/40 p-1 shadow-xl backdrop-blur-xl sm:p-1">
        {destinations.map((destination) => {
          const Icon = destination.icon;
          const isActive = pathname === destination.to;

          return (
            <Link
              key={destination.to}
              to={destination.to}
              aria-current={isActive ? "page" : undefined}
              aria-label={destination.label}
              className={`relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[1.6rem] px-1 py-1 text-[10px] font-medium transition-colors sm:py-1 sm:text-[11px] ${
                isActive ? "text-primary" : "text-foreground hover:text-primary"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="workspace-dock-active"
                  className="absolute inset-0 rounded-[1.6rem] bg-primary/10 shadow-sm"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon className="relative z-10 h-5 w-5 shrink-0 sm:h-5 sm:w-5" strokeWidth={2.2} />
              <span className="relative z-10 truncate">{destination.label}</span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}