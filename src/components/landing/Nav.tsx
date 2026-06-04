import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Magnetic } from "@/components/motion/primitives";

export function Nav() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const last = useRef(0);

  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 12);
    const diff = y - last.current;
    if (y > 120 && diff > 6) setHidden(true);
    else if (diff < -4) setHidden(false);
    last.current = y;
  });

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: hidden ? -100 : 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 26, mass: 0.6 }}
      className="fixed top-0 inset-x-0 z-50 flex justify-center px-4 pt-4"
    >
      <motion.nav
        animate={{
          backdropFilter: scrolled ? "blur(32px) saturate(180%)" : "blur(20px) saturate(140%)",
          borderColor: scrolled ? "oklch(1 0 0 / 0.14)" : "oklch(1 0 0 / 0.08)",
        }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="glass-strong w-full max-w-6xl rounded-2xl px-4 sm:px-6 h-14 flex items-center justify-between"
      >
        <Link to="/" className="flex items-center gap-2.5 group">
          <motion.div
            whileHover={{ rotate: 8, scale: 1.06 }}
            transition={{ type: "spring", stiffness: 300, damping: 16 }}
            className="relative h-7 w-7 rounded-lg bg-gradient-to-br from-primary-glow to-primary glow-primary flex items-center justify-center"
          >
            <div className="h-2.5 w-2.5 rounded-sm bg-background" />
          </motion.div>
          <span className="font-semibold tracking-tight text-[15px]">
            Zentry <span className="text-muted-foreground font-medium">Qor</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          {[
            { href: "#features", label: "Features" },
            { href: "#vault", label: "Vault" },
            { href: "#pricing", label: "Pricing" },
            { href: "#faq", label: "FAQ" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="relative hover:text-foreground transition-colors group"
            >
              {l.label}
              <span className="absolute left-0 -bottom-1 h-px w-full bg-gradient-to-r from-primary to-accent origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link to="/auth" className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground h-9 px-3 rounded-lg transition-colors items-center">
            Sign in
          </Link>
          <Magnetic strength={10}>
            <Link to="/auth" className="group inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-foreground text-background text-sm font-medium relative overflow-hidden">
              <motion.span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30"
                animate={{ opacity: [0.0, 0.35, 0.0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="relative">Get started</span>
              <ArrowUpRight className="relative h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </Magnetic>
        </div>
      </motion.nav>
    </motion.header>
  );
}
