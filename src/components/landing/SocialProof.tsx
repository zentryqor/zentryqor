import { motion } from "framer-motion";

const logos = [
  "Framer", "Notion", "Linear", "Stripe", "Arc", "Vercel", "Figma", "Loom", "Superhuman", "Raycast",
];

export function SocialProof() {
  return (
    <section className="py-16 px-4 border-y border-border bg-surface/40">
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground mb-8"
      >
        Trusted by creators from
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative max-w-6xl mx-auto overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]"
      >
        <div className="flex gap-14 animate-marquee whitespace-nowrap">
          {[...logos, ...logos].map((l, i) => (
            <motion.span
              key={i}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="text-2xl font-semibold tracking-tight text-muted-foreground/70 hover:text-foreground transition-colors cursor-default inline-block"
            >
              {l}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
