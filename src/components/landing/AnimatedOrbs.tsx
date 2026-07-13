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

    // Heuristic for low-end devices: few cores, low memory, mobile, or coarse pointer.
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const cores = nav.hardwareConcurrency ?? 8;
    const mem = nav.deviceMemory ?? 8;
    const saveData = nav.connection?.saveData ?? false;
    const isMobile = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
    if (cores <= 4 || mem <= 4 || saveData || isMobile) setLowPower(true);

    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return { animate: visible && !reduced, lowPower: lowPower || !!reduced };
}

export function AnimatedOrbs() {
  // Disabled: keep pages on a pure black background.
  return null;
}

