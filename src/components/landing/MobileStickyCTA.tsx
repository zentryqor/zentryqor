import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

export function MobileStickyCTA() {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 1.5, ease: "easeOut" }}
      className="md:hidden fixed bottom-0 inset-x-0 z-50 px-3 pb-3 pt-2 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none"
    >
      <div className="pointer-events-auto glass-strong rounded-2xl p-2 flex items-center gap-2 shadow-[0_20px_60px_-20px_oklch(0_0_0/0.9)]">
        <div className="flex-1 pl-2">
          <div className="text-[11px] text-muted-foreground leading-tight">From $12.99/mo</div>
          <div className="text-[13px] font-medium leading-tight flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-accent" /> Unlock Premium
          </div>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
          <Link
            to="/auth"
            className="inline-flex items-center gap-1 h-10 px-4 rounded-xl bg-foreground text-background text-sm font-medium glow-primary"
          >
            Start free
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}
