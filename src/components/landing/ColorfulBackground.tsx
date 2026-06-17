export function ColorfulBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Animated gradient base */}
      <div className="absolute inset-0 cb-gradient opacity-70" />

      {/* Floating color blobs */}
      <div className="cb-blob cb-blob-1" />
      <div className="cb-blob cb-blob-2" />
      <div className="cb-blob cb-blob-3" />
      <div className="cb-blob cb-blob-4" />
      <div className="cb-blob cb-blob-5" />

      {/* Subtle grain / vignette to keep text legible */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.6)_70%,hsl(var(--background)/0.95)_100%)]" />
    </div>
  );
}
