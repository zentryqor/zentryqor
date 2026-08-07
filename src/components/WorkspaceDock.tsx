import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Boxes, Calendar, Captions, LayoutDashboard, WandSparkles } from "lucide-react";

const destinations = [
  { screen: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { screen: "ai" as const, label: "AI Studio", icon: WandSparkles },
  { screen: "caption-ai" as const, label: "CaptionAI", icon: Captions },
  { screen: "poster" as const, label: "Poster", icon: Calendar },
  { screen: "assets" as const, label: "Assets", icon: Boxes },
];

export function WorkspaceDock() {
  const { pathname, search } = useRouterState({
    select: (state) => ({
      pathname: state.location.pathname,
      search: state.location.search as { screen?: string },
    }),
  });
  // The dock is only shown on the combined workspace page.
  if (pathname !== "/studio") return null;

  const currentScreen = search.screen ?? "dashboard";

  return (
    <nav
      aria-label="Workspace navigation"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto w-auto max-w-2xl sm:inset-x-6 sm:bottom-6"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="liquid-dock grid grid-cols-5 items-stretch p-1">
        {destinations.map((destination) => {
          const Icon = destination.icon;
          const isActive = currentScreen === destination.screen;

          return (
            <Link
              key={destination.screen}
              to="/studio"
              search={{ screen: destination.screen }}
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