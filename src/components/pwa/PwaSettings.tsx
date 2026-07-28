import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Download, HardDrive, RefreshCw, Smartphone, Trash2 } from "lucide-react";
import { haptic, isIos, isStandalone, useInstallPrompt } from "@/lib/pwa/use-pwa";

export const APP_VERSION = "1.0.0";

function formatBytes(bytes: number) {
  if (!bytes) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return mb < 1 ? `${(bytes / 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`;
}

/** PWA status + maintenance controls for the settings page. */
export function PwaSettings() {
  const { canInstall, install } = useInstallPrompt();
  const [installed, setInstalled] = useState(false);
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);
  const [cacheBytes, setCacheBytes] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshStorage = async () => {
    try {
      if (navigator.storage?.estimate) {
        const est = await navigator.storage.estimate();
        setUsage({ used: est.usage ?? 0, quota: est.quota ?? 0 });
        const caches = (est as { usageDetails?: Record<string, number> }).usageDetails?.caches;
        setCacheBytes(typeof caches === "number" ? caches : null);
      }
    } catch {
      /* noop */
    }
  };

  useEffect(() => {
    setInstalled(isStandalone());
    refreshStorage();
  }, []);

  const checkForUpdates = async () => {
    setChecking(true);
    setMessage(null);
    try {
      const regs = (await navigator.serviceWorker?.getRegistrations()) ?? [];
      await Promise.all(regs.map((r) => r.update()));
      setMessage(regs.length ? "You're on the latest version." : "Updates apply on your next visit.");
    } catch {
      setMessage("Couldn't check right now.");
    } finally {
      setChecking(false);
    }
  };

  const clearCache = async () => {
    haptic();
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("zq-") || k.includes("precache")).map((k) => caches.delete(k)));
      setMessage("Offline cache cleared. Your sign-in and saved data are untouched.");
      await refreshStorage();
    } catch {
      setMessage("Couldn't clear the cache.");
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby="pwa-settings-heading"
      className="rounded-3xl border border-border/50 bg-elevated/30 p-5 backdrop-blur-xl sm:p-6"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Smartphone className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h2 id="pwa-settings-heading" className="text-base font-semibold">
            App &amp; offline
          </h2>
          <p className="text-xs text-muted-foreground">Installation, storage and updates</p>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/40 bg-background/40 p-3">
          <dt className="text-xs text-muted-foreground">App version</dt>
          <dd className="mt-1 text-sm font-medium tabular-nums">{APP_VERSION}</dd>
        </div>
        <div className="rounded-2xl border border-border/40 bg-background/40 p-3">
          <dt className="text-xs text-muted-foreground">Installation</dt>
          <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium">
            {installed ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden /> Installed
              </>
            ) : (
              "Running in browser"
            )}
          </dd>
        </div>
        <div className="rounded-2xl border border-border/40 bg-background/40 p-3">
          <dt className="text-xs text-muted-foreground">Storage used</dt>
          <dd className="mt-1 text-sm font-medium tabular-nums">
            {usage ? formatBytes(usage.used) : "—"}
          </dd>
        </div>
        <div className="rounded-2xl border border-border/40 bg-background/40 p-3">
          <dt className="text-xs text-muted-foreground">Offline cache</dt>
          <dd className="mt-1 text-sm font-medium tabular-nums">
            {cacheBytes !== null ? formatBytes(cacheBytes) : "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {!installed && canInstall && (
          <button
            type="button"
            onClick={() => {
              haptic();
              install();
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <Download className="h-4 w-4" aria-hidden /> Install app
          </button>
        )}
        <button
          type="button"
          onClick={checkForUpdates}
          disabled={checking}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border/60 px-4 text-sm font-medium transition hover:bg-elevated disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} aria-hidden /> Check for updates
        </button>
        <button
          type="button"
          onClick={clearCache}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border/60 px-4 text-sm font-medium transition hover:bg-elevated"
        >
          <Trash2 className="h-4 w-4" aria-hidden /> Clear offline cache
        </button>
      </div>

      {!installed && !canInstall && isIos() && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-border/40 bg-background/40 p-3 text-xs text-muted-foreground">
          <HardDrive className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          On iPhone or iPad: tap the Share button in Safari, then “Add to Home Screen”.
        </p>
      )}

      {message && (
        <p role="status" aria-live="polite" className="mt-3 text-xs text-muted-foreground">
          {message}
        </p>
      )}
    </motion.section>
  );
}
