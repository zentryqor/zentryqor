import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Boxes, Calendar, Captions, LayoutDashboard, WandSparkles } from "lucide-react";

const destinations = [
  { to: "/dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { to: "/ai" as const, label: "AI Studio", icon: WandSparkles },
  { to: "/caption-ai" as const, label: "CaptionAI", icon: Captions },
  { to: "/poster" as const, label: "Poster", icon: Calendar },
  { to: "/assets" as const, label: "Assets", icon: Boxes },
];

export function WorkspaceDock() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav
      aria-label="Workspace navigation"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto w-auto max-w-2xl sm:inset-x-6 sm:bottom-6"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="liquid-dock grid grid-cols-5 items-stretch p-1">
        {destinations.map((destination) => {
          const Icon = destination.icon;
          const isActive = pathname === destination.to;

          return (
            <Link
              key={destination.to}
              to={destination.to}
              aria-current={isActive ? "page" : undefined}
              aria-label={destination.label}
              className={`liquid-dock__item relative flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[9px] font-medium leading-none sm:text-[10px] ${
                isActive ? "text-foreground" : "text-muted-foreground hover:text-primary"
              }`}
            >

              {isActive && (
                <motion.span
                  layoutId="workspace-dock-active"
                  className="liquid-dock__pill absolute inset-0"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon className="liquid-dock__icon relative z-10 h-[18px] w-[18px] shrink-0" strokeWidth={2.2} />
              <span className="relative z-10 truncate">{destination.label}</span>
            </Link>
          );
        })}

      </div>
    </nav>
  );
}