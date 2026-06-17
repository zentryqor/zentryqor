import { useEffect, useRef } from "react";

export function ColorfulBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const max = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const p = Math.min(1, Math.max(0, window.scrollY / max));
      // Rotate hue across the full scroll range (0deg -> 360deg)
      el.style.setProperty("--cb-hue", `${Math.round(p * 360)}deg`);
      // Shift gradient position so colors visibly slide as you scroll
      el.style.setProperty("--cb-pos", `${Math.round(p * 100)}%`);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden cb-root"
    >
      {/* Deep black base */}
      <div className="absolute inset-0 bg-[hsl(var(--background))]" />

      {/* Animated gradient base — hue rotates with scroll */}
      <div className="absolute inset-0 cb-gradient" />

      {/* Floating color blobs */}
      <div className="cb-blob cb-blob-1" />
      <div className="cb-blob cb-blob-2" />
      <div className="cb-blob cb-blob-3" />
      <div className="cb-blob cb-blob-4" />
      <div className="cb-blob cb-blob-5" />

      {/* Strong vignette to keep text legible and keep black dominant */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.65)_50%,hsl(var(--background)/0.95)_100%)]" />
    </div>
  );
}
