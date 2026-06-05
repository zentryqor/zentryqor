import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type GlassDividerProps = {
  className?: string;
};

export function GlassDivider({ className }: GlassDividerProps) {
  return (
    <div className={cn("relative h-px w-full overflow-hidden", className)} aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-border to-transparent" />
      <motion.div
        initial={{ x: "-30%", opacity: 0 }}
        whileInView={{ x: "130%", opacity: [0, 1, 0] }}
        viewport={{ once: true, margin: "-20px" }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-0 left-0 h-px w-1/3 bg-gradient-to-r from-transparent via-accent to-transparent blur-[1px]"
      />
    </div>
  );
}
