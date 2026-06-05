import { useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
  glare?: boolean;
};

export function TiltCard({
  children,
  className,
  maxTilt = 8,
  glare = true,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, active: false });
  const reduce = useReducedMotion();

  const onMove = (e: React.MouseEvent) => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setT({
      rx: (0.5 - py) * maxTilt * 2,
      ry: (px - 0.5) * maxTilt * 2,
      gx: px * 100,
      gy: py * 100,
      active: true,
    });
  };

  const onLeave = () => setT((p) => ({ ...p, rx: 0, ry: 0, active: false }));

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ transformStyle: "preserve-3d", perspective: 1200 }}
      animate={{ rotateX: t.rx, rotateY: t.ry }}
      transition={{ type: "spring", stiffness: 180, damping: 18, mass: 0.5 }}
      className={cn("relative will-change-transform", className)}
    >
      {children}
      {glare && !reduce && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
          style={{
            opacity: t.active ? 1 : 0,
            background: `radial-gradient(circle at ${t.gx}% ${t.gy}%, oklch(1 0 0 / 0.18), transparent 45%)`,
          }}
        />
      )}
    </motion.div>
  );
}
