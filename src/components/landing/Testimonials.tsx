import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";

const testimonials = [
  {
    q: "Cancelled six subscriptions. Doubled my output. Zentry is the only tab I keep open.",
    a: "Maya R.",
    r: "Reels creator · 480K",
    offset: "md:translate-y-0",
    height: "h-72",
  },
  {
    q: "The vault is worth the price alone. The AI tools are the cherry on top.",
    a: "Daniel K.",
    r: "Video editor",
    offset: "md:translate-y-10",
    height: "h-60",
  },
  {
    q: "Finally a creator app that doesn't feel like a Bootstrap template with a dark mode toggle.",
    a: "Sora T.",
    r: "Designer · founder",
    offset: "md:-translate-y-6",
    height: "h-72",
  },
  {
    q: "Plan, edit, ship — without leaving the app. My weekends are mine again.",
    a: "Liam P.",
    r: "YouTuber · 1.2M",
    offset: "md:translate-y-12",
    height: "h-60",
  },
];

export function Testimonials() {
  return (
    <section className="py-28 px-4">
      <div className="max-w-6xl mx-auto">
        <Reveal className="max-w-2xl mb-16">
          <div className="text-xs uppercase tracking-[0.22em] text-accent mb-3">
            Loved by operators
          </div>
          <h2 className="text-4xl sm:text-6xl font-semibold tracking-[-0.035em] text-gradient leading-[1.02]">
            Built with feedback from
            <br />
            <span className="text-aurora italic font-medium">people who ship.</span>
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.a}
              initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.6,
                delay: i * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={`${t.offset}`}
            >
              <TiltCard
                maxTilt={5}
                className={`glass rounded-2xl p-6 cursor-default relative overflow-hidden ${t.height}`}
              >
                <Quote className="absolute -top-4 -right-4 h-32 w-32 text-foreground/5" />
                <div className="relative h-full flex flex-col">
                  <blockquote className="text-[15px] leading-relaxed tracking-tight">
                    "{t.q}"
                  </blockquote>
                  <figcaption className="mt-auto pt-6 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent" />
                    <div>
                      <div className="text-sm font-medium">{t.a}</div>
                      <div className="text-xs text-muted-foreground">{t.r}</div>
                    </div>
                  </figcaption>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
