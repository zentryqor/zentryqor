import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import type { ReactNode, MouseEvent } from "react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

type MotionIconProps = {
  children: ReactNode;
  className?: string;
  /** Continuous subtle pulse cadence in seconds. 0 disables. */
  pulse?: number;
  /** Enable 3D cursor-tracking tilt. */
  tilt?: boolean;
  /** Maximum tilt in degrees. */
  maxTilt?: number;
  /** Hover lift in px. */
  lift?: number;
  /** Hover scale. */
  scale?: number;
};

/**
 * Premium icon wrapper — lift, scale, glow, optional cursor tilt and
 * ambient pulse. GPU-only transforms. Respects prefers-reduced-motion.
 */
export function MotionIcon({
  children,
  className,
  pulse = 0,
  tilt = true,
  maxTilt = 8,
  lift = 3,
  scale = 1.06,
}: MotionIconProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-maxTilt, maxTilt]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [maxTilt, -maxTilt]);

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!tilt || reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  };
  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      whileHover={reduce ? undefined : { y: -lift, scale }}
      transition={{ type: "spring", stiffness: 320, damping: 22, mass: 0.6 }}
      animate={
        pulse && !reduce
          ? { filter: ["brightness(1)", "brightness(1.15)", "brightness(1)"] }
          : undefined
      }
      // @ts-expect-error duration only valid when animate is present
      transition-pulse={
        pulse
          ? { duration: pulse, repeat: Infinity, ease: "easeInOut" }
          : undefined
      }
      style={
        tilt && !reduce
          ? { rotateX, rotateY, transformStyle: "preserve-3d" }
          : undefined
      }
      className={cn("icon-fx inline-flex items-center justify-center will-change-transform", className)}
    >
      {children}
    </motion.div>
  );
}
