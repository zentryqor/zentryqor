import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

function useShouldAnimate() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [lowPower, setLowPower] = useState(false);

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    onVis();

    // Heuristic for low-end devices: few cores, low memory, or mobile.
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const cores = nav.hardwareConcurrency ?? 8;
    const mem = nav.deviceMemory ?? 8;
    const saveData = nav.connection?.saveData ?? false;
    if (cores <= 4 || mem <= 4 || saveData) setLowPower(true);

    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return { animate: visible && !reduced, lowPower: lowPower || !!reduced };
}

export function AnimatedOrbs() {
  const { animate, lowPower } = useShouldAnimate();

  // On low-power devices, render just two static-ish orbs.
  if (lowPower) {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute bottom-1/4 left-[10%] h-48 w-48 rounded-full bg-accent/15 blur-[90px]" />
      </div>
    );
  }

  const play = animate ? "animate" : "rest";

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Massive primary orb — strong drift + pulse */}
      <motion.div
        className="absolute top-1/4 left-1/2 h-[700px] w-[1100px] rounded-full bg-primary/20 blur-[140px] will-change-transform"
        variants={{
          rest: { x: "-50%", y: 0, scale: 1, opacity: 0.55 },
          animate: {
            x: ["-60%", "-40%", "-55%", "-50%"],
            y: ["-15%", "12%", "-8%", "-15%"],
            scale: [1, 1.2, 0.95, 1],
            opacity: [0.45, 0.75, 0.55, 0.45],
          },
        }}
        animate={play}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Accent orb top-right — bigger sweep */}
      <motion.div
        className="absolute top-10 right-[2%] h-96 w-96 rounded-full bg-accent/20 blur-[110px] will-change-transform"
        variants={{
          rest: { x: 0, y: 0, scale: 1, opacity: 0.45 },
          animate: {
            x: [0, -60, 40, 0],
            y: [0, 50, -30, 0],
            scale: [1, 1.3, 0.9, 1],
            opacity: [0.4, 0.7, 0.5, 0.4],
          },
        }}
        animate={play}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      {/* Glow orb bottom-left */}
      <motion.div
        className="absolute bottom-1/5 left-[5%] h-72 w-72 rounded-full bg-primary-glow/25 blur-[100px] will-change-transform"
        variants={{
          rest: { x: 0, y: 0, scale: 1, opacity: 0.4 },
          animate: {
            x: [0, 80, -20, 0],
            y: [0, -60, 30, 0],
            scale: [1, 1.4, 1.1, 1],
            opacity: [0.35, 0.65, 0.45, 0.35],
          },
        }}
        animate={play}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* Bottom-right ember */}
      <motion.div
        className="absolute bottom-[8%] right-[10%] h-80 w-80 rounded-full bg-accent/15 blur-[110px] will-change-transform"
        variants={{
          rest: { x: 0, y: 0, scale: 1, opacity: 0.3 },
          animate: {
            x: [0, -70, 30, 0],
            y: [0, -40, 20, 0],
            scale: [1, 1.25, 0.95, 1],
            opacity: [0.3, 0.55, 0.4, 0.3],
          },
        }}
        animate={play}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />

      {/* Roaming highlight — small fast orb adds energy */}
      <motion.div
        className="absolute top-1/2 left-1/3 h-40 w-40 rounded-full bg-primary-glow/30 blur-[70px] will-change-transform"
        variants={{
          rest: { x: 0, y: 0, opacity: 0.3 },
          animate: {
            x: [-60, 120, -40, -60],
            y: [-40, 60, 100, -40],
            opacity: [0.25, 0.6, 0.35, 0.25],
          },
        }}
        animate={play}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
    </div>
  );
}
