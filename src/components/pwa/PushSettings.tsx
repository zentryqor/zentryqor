import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, BellOff, Laptop, Moon, Send, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PUSH_CATEGORIES, type PushCategory } from "@/lib/push-categories";
import {
  getPushSettings,
  removePushDevice,
  sendTestPush,
  updatePushPreferences,
} from "@/lib/push.functions";
import { usePushNotifications } from "@/lib/pwa/use-push";
import { haptic, isIos, isStandalone } from "@/lib/pwa/use-pwa";
import { Button } from "@/components/ui/button";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

/** Notification permission flow + per-category subscription management. */
export function PushSettings() {
  const queryClient = useQueryClient();
  const push = usePushNotifications();
  const fetchSettings = useServerFn(getPushSettings);
  const savePrefs = useServerFn(updatePushPreferences);
  const dropDevice = useServerFn(removePushDevice);
  const testPush = useServerFn(sendTestPush);

  const { data, isLoading } = useQuery({
    queryKey: ["push-settings"],
    queryFn: () => fetchSettings(),
  });

  const [quiet, setQuiet] = useState<{ start: number | null; end: number | null }>({
    start: null,
    end: null,
  });

  useEffect(() => {
    if (data?.preferences) {
      setQuiet({
        start: data.preferences.quiet_hours_start,
        end: data.preferences.quiet_hours_end,
      });
    }
  }, [data?.preferences]);

  const prefsMutation = useMutation({
    mutationFn: (patch: Record<string, boolean | number | null>) => savePrefs({ data: patch }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["push-settings"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => dropDevice({ data: { id } }),
    onSuccess: () => {
      toast.success("Device removed");
      queryClient.invalidateQueries({ queryKey: ["push-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testMutation = useMutation({
    mutationFn: () => testPush(),
    onSuccess: (r) => (r.sent ? toast.success(r.message) : toast.error(r.message)),
    onError: (e: Error) => toast.error(e.message),
  });

  const prefs = data?.preferences;
  const iosNeedsInstall = useMemo(() => isIos() && !isStandalone(), []);

  const toggleCategory = (key: PushCategory, value: boolean) => {
    haptic();
    queryClient.setQueryData(["push-settings"], (old: typeof data) =>
      old ? { ...old, preferences: { ...old.preferences, [key]: value } } : old,
    );
    prefsMutation.mutate({ [key]: value });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby="push-settings-heading"
      className="rounded-3xl border border-border/50 bg-elevated/30 p-5 backdrop-blur-xl sm:p-6"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Bell className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="push-settings-heading" className="text-base font-semibold">
            Push notifications
          </h2>
          <p className="text-xs text-muted-foreground">
            Choose exactly what pings your phone or desktop.
          </p>
        </div>
      </div>

      {/* Permission flow */}
      <div className="mt-5 rounded-2xl border border-border/40 bg-background/40 p-4">
        {!push.supported ? (
          <p className="text-sm text-muted-foreground">
            This browser doesn't support push notifications.
            {iosNeedsInstall
              ? " On iPhone, add Zentry Qor to your home screen first, then re-open it from the icon."
              : ""}
          </p>
        ) : push.enabled ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">Notifications are on for this device</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Delivery is instant, even when the app is closed.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={testMutation.isPending}
                onClick={() => testMutation.mutate()}
                className="h-10 rounded-full px-4 text-sm"
              >
                <Send className="h-3.5 w-3.5" aria-hidden />
                {testMutation.isPending ? "Sending…" : "Send test"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={push.busy}
                onClick={async () => {
                  const ok = await push.disable();
                  if (ok) toast.success("Notifications turned off on this device");
                }}
                className="h-10 rounded-full px-4 text-sm"
              >
                <BellOff className="h-3.5 w-3.5" aria-hidden /> Turn off
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">Turn on notifications</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {push.permission === "denied"
                  ? "Notifications are blocked — allow them for this app in your browser settings, then try again."
                  : iosNeedsInstall
                    ? "Install Zentry Qor to your home screen first, then enable notifications from the installed app."
                    : "We'll ask your browser for permission — you stay in control of every category below."}
              </p>
            </div>
            <Button
              type="button"
              disabled={push.busy}
              onClick={async () => {
                haptic();
                const ok = await push.enable();
                if (ok) {
                  toast.success("Notifications enabled");
                  queryClient.invalidateQueries({ queryKey: ["push-settings"] });
                }
              }}
              className="h-10 rounded-full px-5 text-sm"
            >
              <Bell className="h-3.5 w-3.5" aria-hidden />
              {push.busy ? "Enabling…" : "Enable"}
            </Button>
          </div>
        )}
        {push.error && <p className="mt-3 text-xs text-destructive">{push.error}</p>}
      </div>

      {/* Categories */}
      <div className="mt-5 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Categories
        </p>
        {isLoading || !prefs ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          PUSH_CATEGORIES.map((cat) => (
            <div
              key={cat.key}
              className="flex items-start gap-3 rounded-2xl border border-border/40 bg-background/40 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{cat.label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{cat.description}</div>
              </div>
              <label className="switch" aria-label={cat.label}>
                <input
                  type="checkbox"
                  checked={prefs[cat.key]}
                  onChange={(e) => toggleCategory(cat.key, e.target.checked)}
                />
                <span className="slider">
                  <span className="glow" />
                </span>
              </label>
            </div>
          ))
        )}
      </div>

      {/* Quiet hours */}
      <div className="mt-5 rounded-2xl border border-border/40 bg-background/40 p-4">
        <div className="flex items-center gap-2">
          <Moon className="h-3.5 w-3.5 text-primary" aria-hidden />
          <p className="text-sm font-medium">Quiet hours (UTC)</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Nothing is delivered during this window. Leave both as “Off” to always receive.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(["start", "end"] as const).map((edge) => (
            <label key={edge} className="text-xs text-muted-foreground">
              <span className="mr-2 capitalize">{edge}</span>
              <select
                value={quiet[edge] ?? ""}
                onChange={(e) => {
                  const value = e.target.value === "" ? null : Number(e.target.value);
                  const next = { ...quiet, [edge]: value };
                  setQuiet(next);
                  prefsMutation.mutate({
                    quiet_hours_start: next.start,
                    quiet_hours_end: next.end,
                  });
                }}
                className="h-9 rounded-xl border border-border/60 bg-elevated/60 px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">Off</option>
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      {/* Devices */}
      <div className="mt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Subscribed devices
        </p>
        <div className="mt-3 space-y-2">
          {(data?.devices ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No devices subscribed yet.</p>
          ) : (
            data!.devices.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 rounded-2xl border border-border/40 bg-background/40 p-3"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-elevated/80 text-muted-foreground">
                  {d.platform === "web" ? (
                    <Laptop className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Smartphone className="h-3.5 w-3.5" aria-hidden />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium capitalize">
                    {d.platform ?? "device"} · …{d.tokenTail}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last active {new Date(d.lastSeenAt).toLocaleString()}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Remove device"
                  onClick={() => removeMutation.mutate(d.id)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.section>
  );
}
