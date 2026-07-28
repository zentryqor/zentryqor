/**
 * The ONLY place that registers the app service worker.
 *
 * Registration is refused (and any matching stale registration removed) in dev,
 * inside iframes, in Lovable preview hosts, and when `?sw=off` is present.
 */
const SW_URL = "/sw.js";

export function swAllowed(): boolean {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
  if (!import.meta.env.PROD) return false;
  if (window.self !== window.top) return false;

  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return false;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return false;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return false;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return false;
  if (new URLSearchParams(window.location.search).has("sw")) {
    if (new URLSearchParams(window.location.search).get("sw") === "off") return false;
  }
  return true;
}

async function unregisterAppSw() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((r) => {
        const url = r.active?.scriptURL ?? r.installing?.scriptURL ?? r.waiting?.scriptURL ?? "";
        return url.endsWith(SW_URL);
      })
      .map((r) => r.unregister()),
  );
}

export type RegisterSwCallbacks = {
  onNeedRefresh: (update: () => Promise<void>) => void;
  onOfflineReady?: () => void;
};

export async function registerAppSw({ onNeedRefresh, onOfflineReady }: RegisterSwCallbacks) {
  if (!swAllowed()) {
    await unregisterAppSw();
    return;
  }

  const { registerSW } = await import("virtual:pwa-register");
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () => onNeedRefresh(async () => updateSW(true)),
    onOfflineReady: () => onOfflineReady?.(),
  });
}
