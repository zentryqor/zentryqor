import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Home, Map, Tag, BookOpen, Info, Mail } from "lucide-react";
import logoAsset from "@/assets/zentry-logo.png.asset.json";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function Nav() {
  const { user, loading } = useAuth();

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email ??
    "";

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 inset-x-0 z-50 flex justify-center px-4 pt-3"
    >
      <nav className="glass-strong w-full max-w-6xl rounded-2xl px-3 sm:px-6 h-11 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1.5 sm:gap-2 group shrink-0 min-w-0">
          <div className="relative h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center shrink-0">
            <img src={logoAsset.url} alt="Zentry Qor logo" className="h-6 w-6 sm:h-7 sm:w-7 object-contain drop-shadow-[0_0_12px_oklch(0.65_0.2_250/0.45)]" />
          </div>
          <span className="font-semibold tracking-tight text-xs sm:text-sm truncate">
            Zentry <span className="text-muted-foreground font-medium">Qor</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#vault" className="hover:text-foreground transition-colors">Vault</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {loading ? null : user ? (
            <ProfilePopover initial={(displayName?.[0] ?? "U").toUpperCase()} email={user.email ?? ""} />
          ) : (
            <>
              <Link to="/auth" className="inline-flex whitespace-nowrap text-[11px] sm:text-xs text-muted-foreground hover:text-foreground h-7 sm:h-8 px-2 sm:px-3 rounded-lg transition-colors items-center">
                Log in
              </Link>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
              <Link to="/auth" className="btn-donate inline-flex whitespace-nowrap items-center justify-center" style={{ ["--size" as any]: "0.75rem", minHeight: 0, minWidth: 0, padding: "0.4em 1em" }}>
                Get started
              </Link>
              </motion.div>
            </>
          )}
        </div>
      </nav>
    </motion.header>
  );
}

function ProfilePopover({ initial, email }: { initial: string; email: string }) {
  const items = [
    { to: "/", label: "Home", icon: Home },
    { to: "/roadmap", label: "Roadmap", icon: Map },
    { to: "/#pricing", label: "Pricing", icon: Tag, hash: true },
    { to: "/docs", label: "Docs", icon: BookOpen },
    { to: "/about", label: "About", icon: Info },
    { to: "/contact", label: "Contact", icon: Mail },
  ] as const;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          aria-label="Open menu"
          className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-semibold text-primary-foreground ring-0 hover:ring-2 hover:ring-primary/40 transition"
        >
          {initial}
        </motion.button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={12}
        className="w-[240px] p-2 rounded-2xl glass-strong bg-background/40 shadow-2xl shadow-black/40 border-white/10"
      >
        <div className="px-3 pt-2 pb-3 border-b border-white/10 mb-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Signed in</div>
          <div className="text-sm font-medium truncate mt-0.5">{email}</div>
        </div>
        <div className="flex flex-col">
          {items.map((it) =>
            "hash" in it ? (
              <a
                key={it.label}
                href={it.to}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition"
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </a>
            ) : (
              <Link
                key={it.label}
                to={it.to}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition"
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </Link>
            )
          )}
        </div>
        <div className="border-t border-white/10 mt-2 pt-2">
          <Link
            to="/dashboard"
            className="flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold bg-gradient-to-r from-primary/20 to-accent/20 hover:from-primary/30 hover:to-accent/30 transition"
          >
            Go to dashboard
          </Link>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full mt-1 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition"
          >
            Sign out
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

