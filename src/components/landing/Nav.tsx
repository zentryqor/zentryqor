import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "./Logo";

export function Nav() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 inset-x-0 z-50 flex justify-center px-4 pt-4"
    >
      <nav className="glass-strong w-full max-w-6xl rounded-2xl px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <Logo className="h-8 w-8 drop-shadow-[0_4px_12px_rgba(30,107,230,0.4)]" />
          <span className="font-semibold tracking-tight text-[15px]">
            Zentry <span className="text-muted-foreground font-medium">Qor</span>
          </span>
          <span className="font-semibold tracking-tight text-[15px]">
            Zentry <span className="text-muted-foreground font-medium">Qor</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#vault" className="hover:text-foreground transition-colors">Vault</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/auth" className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground h-9 px-3 rounded-lg transition-colors items-center">
            Sign in
          </Link>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
            <Link to="/auth" className="group inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity">
              Get started
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </motion.div>
        </div>
      </nav>
    </motion.header>
  );
}
