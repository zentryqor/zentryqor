import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import logoAsset from "@/assets/zentry-logo.png.asset.json";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

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
            <>
              <button
                onClick={() => supabase.auth.signOut()}
                className="inline-flex whitespace-nowrap text-[11px] sm:text-xs text-muted-foreground hover:text-foreground h-7 sm:h-8 px-2 sm:px-3 rounded-lg transition-colors items-center"
                type="button"
              >
                Sign out
              </button>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                <Link
                  to="/dashboard"
                  aria-label="Go to dashboard"
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-semibold text-primary-foreground"
                >
                  {(displayName?.[0] ?? "U").toUpperCase()}
                </Link>
              </motion.div>
            </>
          ) : (
            <>
              <Link to="/auth" className="inline-flex whitespace-nowrap text-[11px] sm:text-xs text-muted-foreground hover:text-foreground h-7 sm:h-8 px-2 sm:px-3 rounded-lg transition-colors items-center">
                Log in
              </Link>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                <Link to="/auth" className="inline-flex whitespace-nowrap items-center justify-center h-7 sm:h-8 px-2.5 sm:px-4 rounded-xl bg-[oklch(0.62_0.19_255)] text-white text-[11px] sm:text-xs font-semibold hover:opacity-90 transition-opacity shadow-[0_4px_14px_oklch(0.62_0.19_255/0.4)]">
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
