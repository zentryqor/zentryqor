"use client";
import { motion, useReducedMotion, useScroll, useSpring, useTransform, useMotionValue, AnimatePresence, type Variants } from "framer-motion";
import { createElement } from "react";
import { useEffect, useRef, useState, type ReactNode, type ComponentPropsWithoutRef } from "react";

const easeOut = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: easeOut } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.6, ease: easeOut } },
};

export const stagger = (delayChildren = 0, staggerChildren = 0.08): Variants => ({
  hidden: {},
  show: { transition: { delayChildren, staggerChildren } },
});

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: "div" | "section" | "li" | "span";
  once?: boolean;
  amount?: number;
};

export function Reveal({ children, className, delay = 0, y = 24, as = "div", once = true, amount = 0.2 }: RevealProps) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as] as typeof motion.div;
  if (reduce) {
    const Tag = as as keyof JSX.IntrinsicElements;
    return <Tag className={className}>{children}</Tag>;
  }
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once, amount, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.7, ease: easeOut, delay }}
    >
      {children}
    </MotionTag>
  );
}

export function StaggerGroup({
  children,
  className,
  delayChildren = 0.05,
  staggerChildren = 0.08,
  amount = 0.15,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delayChildren?: number;
  staggerChildren?: number;
  amount?: number;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      variants={stagger(delayChildren, staggerChildren)}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, y = 18 }: { children: ReactNode; className?: string; y?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y, filter: "blur(6px)" },
        show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: easeOut } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function WordReveal({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  if (reduce) return <span className={className}>{text}</span>;
  return (
    <motion.span
      className={className}
      initial="hidden"
      animate="show"
      variants={stagger(delay, 0.08)}
      aria-label={text}
    >
      {words.map((w, i) => (
        <motion.span
          key={i}
          className="inline-block will-change-transform"
          variants={{
            hidden: { opacity: 0, y: "0.6em", filter: "blur(10px)" },
            show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: easeOut } },
          }}
        >
          {w}
          {i < words.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </motion.span>
  );
}

type MagneticProps = HTMLMotionProps<"div"> & {
  strength?: number;
  as?: "div" | "a" | "button";
};

export function Magnetic({ children, strength = 18, className, ...rest }: { children: ReactNode; strength?: number; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: sx, y: sy }}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        const mx = e.clientX - (r.left + r.width / 2);
        const my = e.clientY - (r.top + r.height / 2);
        x.set((mx / r.width) * strength);
        y.set((my / r.height) * strength);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 24, mass: 0.3 });
  return (
    <motion.div
      aria-hidden
      className="fixed top-0 left-0 right-0 h-[2px] z-[60] origin-left bg-gradient-to-r from-primary via-accent to-primary-glow"
      style={{ scaleX }}
    />
  );
}

export function AmbientParticles({ count = 18 }: { count?: number }) {
  const reduce = useReducedMotion();
  const [seeds, setSeeds] = useState<{ x: number; y: number; d: number; s: number; o: number }[]>([]);
  useEffect(() => {
    setSeeds(
      Array.from({ length: count }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        d: 14 + Math.random() * 18,
        s: 1 + Math.random() * 2.5,
        o: 0.15 + Math.random() * 0.35,
      }))
    );
  }, [count]);
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {seeds.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-accent/40 blur-[1px]"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, opacity: p.o }}
          animate={{ y: [-12, 12, -12], opacity: [p.o * 0.6, p.o, p.o * 0.6] }}
          transition={{ duration: p.d, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export function useParallax(distance = 60) {
  const { scrollY } = useScroll();
  return useTransform(scrollY, [0, 800], [0, -distance]);
}

export { motion, AnimatePresence, useReducedMotion, useScroll, useTransform, useSpring };
