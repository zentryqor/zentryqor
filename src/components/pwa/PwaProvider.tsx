import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Download, RefreshCw, WifiOff, X } from "lucide-react";
import { registerAppSw } from "@/lib/pwa/register-sw";
import { haptic, useInstallPrompt, useOnlineStatus } from "@/lib/pwa/use-pwa";

const INSTALL_DISMISS_KEY = "zq_install_dismissed_at";
const DISMISS_MS = 1000 * 60 * 60 * 24 * 7;

/**
 * App-wide PWA layer: service-worker registration, update bottom sheet,
 * custom install prompt, and offline banner.
 */
export function PwaProvider() {
  const [update, setUpdate] = useState<(() => Promise<void>) | null>(null);
  const [updating, setUpdating] = useState(false);
  const { canInstall, install } = useInstallPrompt();
  const [installDismissed, setInstallDismissed] = useState(true);
  const online = useOnlineStatus();

  useEffect(() => {
    registerAppSw({
      onNeedRefresh: (doUpdate) => setUpdate(() => doUpdate),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const at = Number(localStorage.getItem(INSTALL_DISMISS_KEY) ?? 0);
      setInstallDismissed(Date.now() - at < DISMISS_MS);
    } catch {
      setInstallDismissed(false);
    }
  }, []);

  const showInstall = canInstall && !installDismissed;

  return (
    <>
      <AnimatePresence>
        {!online && (
          <motion.div
            key="offline"
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            role="status"
            aria-live="polite"
            className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-elevated/90 px-4 py-2 text-xs font-medium text-foreground backdrop-blur-xl"
            style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
          >
            <WifiOff className="h-3.5 w-3.5 text-primary" aria-hidden />
            You're offline — showing cached content
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {update && (
          <motion.div
            key="update"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            role="dialog"
            aria-label="New version available"
            className="fixed inset-x-3 bottom-3 z-[110] mx-auto max-w-md rounded-3xl border border-border/50 bg-elevated/80 p-4 shadow-2xl backdrop-blur-xl sm:inset-x-6"
            style={{ marginBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <RefreshCw className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">New version available</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Reload to get the latest Zentry Qor. Your session and saved data stay intact.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={updating}
                    onClick={async () => {
                      haptic();
                      setUpdating(true);
                      await update();
                    }}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                  >
                    {updating ? "Updating…" : "Update now"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdate(null)}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-border/60 px-4 text-sm font-medium text-foreground transition hover:bg-elevated"
                  >
                    Later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInstall && !update && (
          <motion.div
            key="install"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-x-3 bottom-3 z-[105] mx-auto max-w-md rounded-3xl border border-border/50 bg-elevated/80 p-4 shadow-2xl backdrop-blur-xl sm:inset-x-6"
            style={{ marginBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Download className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Install Zentry Qor</p>
                <p className="text-xs text-muted-foreground">Full-screen app, works offline.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  haptic();
                  install();
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                Install
              </button>
              <button
                type="button"
                aria-label="Dismiss install prompt"
                onClick={() => {
                  try {
                    localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
                  } catch {
                    /* noop */
                  }
                  setInstallDismissed(true);
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
