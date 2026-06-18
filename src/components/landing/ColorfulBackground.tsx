export function ColorfulBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden cb-root"
    >
      {/* Deep black base */}
      <div className="absolute inset-0 bg-[hsl(var(--background))]" />

      {/* Animated gradient base */}
      <div className="absolute inset-0 cb-gradient" />

      {/* Floating color blobs (count reduced on mobile via CSS) */}
      <div className="cb-blob cb-blob-1" />
      <div className="cb-blob cb-blob-2" />
      <div className="cb-blob cb-blob-3" />
      <div className="cb-blob cb-blob-4" />
      <div className="cb-blob cb-blob-5" />

      {/* Strong vignette to keep text legible and keep black dominant */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--background)/0.35)_0%,hsl(var(--background)/0.75)_55%,hsl(var(--background)/0.98)_100%)]" />
    </div>
  );
}
