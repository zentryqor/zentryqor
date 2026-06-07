import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { MagneticButton } from "@/components/motion/MagneticButton";

export function CtaFooter() {
  return (
    <section className="px-4 pt-20 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative max-w-6xl mx-auto rounded-[32px] overflow-hidden border border-border bg-gradient-to-b from-elevated to-surface p-10 sm:p-16 text-center"
      >
        <div className="absolute inset-0 ring-grid opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 left-1/2 -translate-x-1/2 h-80 w-[600px] rounded-full bg-primary/30 blur-3xl"
        />

        <div className="relative">
          <h2 className="text-4xl sm:text-7xl font-semibold tracking-[-0.04em] text-gradient leading-[0.98]">
            Open the vault.
            <br />
            <span className="text-aurora italic font-medium">Build like a studio.</span>
          </h2>
          <p className="mt-6 text-muted-foreground max-w-xl mx-auto">
            Join 24,000+ creators who replaced six tools with one. Free forever. Upgrade when it starts paying for itself.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <MagneticButton
              as={Link as any}
              to="/auth"
              className="group inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-foreground text-background text-sm font-semibold glow-primary"
            >
              Start free
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 icon-fx" />
            </MagneticButton>
            <MagneticButton
              as="a"
              href="#pricing"
              strength={10}
              className="h-12 px-6 rounded-xl glass text-sm font-medium flex items-center"
            >
              View pricing
            </MagneticButton>
          </div>
        </div>
      </motion.div>

      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="max-w-6xl mx-auto mt-14 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground"
      >
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-md bg-gradient-to-br from-primary-glow to-primary" />
          <span>© {new Date().getFullYear()} Zentry Qor — Made for people who ship.</span>
        </div>
        <div className="flex gap-6">
          <a className="hover:text-foreground transition-colors" href="#">Privacy</a>
          <a className="hover:text-foreground transition-colors" href="#">Terms</a>
          <a className="hover:text-foreground transition-colors" href="#">Twitter</a>
        </div>
      </motion.footer>
    </section>
  );
}
