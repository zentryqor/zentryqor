import { useRef, useState, type ReactNode, type ElementType, type ComponentPropsWithoutRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

type MagneticButtonProps<T extends ElementType> = {
  as?: T;
  strength?: number;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function MagneticButton<T extends ElementType = "button">({
  as,
  strength = 18,
  className,
  children,
  ...rest
}: MagneticButtonProps<T>) {
  const Comp = (as ?? "button") as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const reduce = useReducedMotion();

  const onMove = (e: React.MouseEvent) => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    const max = strength;
    setPos({
      x: Math.max(-max, Math.min(max, x * 0.35)),
      y: Math.max(-max, Math.min(max, y * 0.35)),
    });
  };

  const onLeave = () => setPos({ x: 0, y: 0 });

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: "spring", stiffness: 220, damping: 18, mass: 0.4 }}
      className="inline-block"
    >
      <Comp ref={ref as any} className={className} {...rest}>
        <motion.span
          className="inline-flex items-center gap-2"
          animate={{ x: pos.x * 0.4, y: pos.y * 0.4 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          {children}
        </motion.span>
      </Comp>
    </motion.div>
  );
}
