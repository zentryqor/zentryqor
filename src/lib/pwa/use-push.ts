import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { PushConfig } from "@/lib/push-categories";
import {
  getPushConfig,
  registerPushDevice,
  unregisterPushDevice,
} from "@/lib/push.functions";

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

const TOKEN_KEY = "zq_push_token";

function supported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

async function messagingSwRegistration(cfg: PushConfig) {
  const query = new URLSearchParams({
    apiKey: cfg.apiKey,
    projectId: cfg.projectId,
    appId: cfg.appId,
    messagingSenderId: cfg.messagingSenderId,
  }).toString();
  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`, {
    scope: "/firebase-cloud-messaging-push-scope",
  });
}

/**
 * Permission + FCM token lifecycle for push notifications.
 * Registers the messaging service worker only when the user opts in.
 */
export function usePushNotifications() {
  const loadConfig = useServerFn(getPushConfig);
  const register = useServerFn(registerPushDevice);
  const unregister = useServerFn(unregisterPushDevice);

  const [permission, setPermission] = useState<PushPermission>("default");
  const [config, setConfig] = useState<PushConfig | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const foregroundBound = useRef(false);

  useEffect(() => {
    if (!supported()) {
      setPermission("unsupported");
    } else {
      setPermission(Notification.permission as PushPermission);
      try {
        setToken(localStorage.getItem(TOKEN_KEY));
      } catch {
        /* noop */
      }
    }
    loadConfig()
      .then(setConfig)
      .catch(() => setConfig(null));
  }, [loadConfig]);

  const enable = useCallback(async () => {
    setError(null);
    if (!supported()) {
      setError("This browser can't receive push notifications. On iPhone, install the app first.");
      return false;
    }
    const cfg = config ?? (await loadConfig());
    setConfig(cfg);
    if (!cfg.configured) {
      setError("Push notifications aren't configured for this workspace yet.");
      return false;
    }

    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PushPermission);
      if (result !== "granted") {
        setError(
          result === "denied"
            ? "Notifications are blocked. Enable them for this app in your browser or system settings."
            : "Permission wasn't granted.",
        );
        return false;
      }

      const swReg = await messagingSwRegistration(cfg);
      const { initializeApp, getApps, getApp } = await import("firebase/app");
      const { getMessaging, getToken, onMessage } = await import("firebase/messaging");

      const app = getApps().length
        ? getApp()
        : initializeApp({
            apiKey: cfg.apiKey,
            authDomain: `${cfg.projectId}.firebaseapp.com`,
            projectId: cfg.projectId,
            appId: cfg.appId,
            messagingSenderId: cfg.messagingSenderId,
          });
      const messaging = getMessaging(app);
      const fcmToken = await getToken(messaging, {
        vapidKey: cfg.vapidKey,
        serviceWorkerRegistration: swReg,
      });
      if (!fcmToken) {
        setError("Couldn't get a notification token from the push service.");
        return false;
      }

      await register({
        data: {
          token: fcmToken,
          platform: /android/i.test(navigator.userAgent)
            ? "android"
            : /iphone|ipad|ipod/i.test(navigator.userAgent)
              ? "ios"
              : "web",
          userAgent: navigator.userAgent.slice(0, 400),
        },
      });
      try {
        localStorage.setItem(TOKEN_KEY, fcmToken);
      } catch {
        /* noop */
      }
      setToken(fcmToken);

      if (!foregroundBound.current) {
        foregroundBound.current = true;
        onMessage(messaging, (payload) => {
          const d = payload.data ?? {};
          if (!d.title) return;
          swReg.showNotification(d.title, {
            body: d.body,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-96.png",
            tag: d.category,
            data: { url: d.url ?? "/dashboard" },
          });
        });
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't enable notifications.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [config, loadConfig, register]);

  const disable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const current = token ?? localStorage.getItem(TOKEN_KEY);
      if (current) await unregister({ data: { token: current } });
      try {
        const { getApps, getApp } = await import("firebase/app");
        if (getApps().length) {
          const { getMessaging, deleteToken } = await import("firebase/messaging");
          await deleteToken(getMessaging(getApp())).catch(() => {});
        }
      } catch {
        /* noop */
      }
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't turn notifications off.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [token, unregister]);

  return {
    permission,
    supported: permission !== "unsupported",
    configured: config?.configured ?? false,
    enabled: Boolean(token) && permission === "granted",
    busy,
    error,
    enable,
    disable,
  };
}
