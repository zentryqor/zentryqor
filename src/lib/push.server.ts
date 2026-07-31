/**
 * Server-only Firebase Cloud Messaging helpers (HTTP v1 API).
 * Auth uses a service-account JWT signed with Web Crypto so it runs on the edge.
 */
import type { PushCategory } from "./push-categories";

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
};

function readServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ServiceAccount;
    if (!parsed.client_email || !parsed.private_key) return null;
    return parsed;
  } catch {
    return null;
  }
}

function b64url(bytes: Uint8Array | string) {
  const str =
    typeof bytes === "string" ? bytes : String.fromCharCode(...Array.from(bytes));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string) {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(sa: ServiceAccount) {
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) return cachedToken.token;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const input = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key.replace(/\\n/g, "\n")),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(input)),
  );
  const assertion = `${input}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`FCM auth failed (${res.status})`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

export type PushMessage = {
  title: string;
  body: string;
  category: PushCategory;
  url?: string;
  image?: string;
};

/**
 * Sends one notification to a list of device tokens.
 * Returns tokens that FCM reported as permanently invalid so callers can prune them.
 */
export async function sendPushToTokens(tokens: string[], message: PushMessage) {
  const sa = readServiceAccount();
  if (!sa) throw new Error("Push notifications are not configured yet.");
  if (!tokens.length) return { sent: 0, invalidTokens: [] as string[] };

  const accessToken = await getAccessToken(sa);
  const invalidTokens: string[] = [];
  let sent = 0;

  await Promise.all(
    tokens.map(async (token) => {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token,
              data: {
                title: message.title,
                body: message.body,
                category: message.category,
                url: message.url ?? "/dashboard",
                ...(message.image ? { image: message.image } : {}),
              },
              webpush: {
                fcm_options: { link: message.url ?? "/dashboard" },
                notification: {
                  title: message.title,
                  body: message.body,
                  icon: "/icons/icon-192.png",
                  badge: "/icons/icon-96.png",
                  tag: message.category,
                },
              },
              android: { priority: "high" },
            },
          }),
        },
      );
      if (res.ok) {
        sent += 1;
        return;
      }
      const text = await res.text();
      if (res.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/i.test(text)) {
        invalidTokens.push(token);
      }
      console.error("FCM send failed", res.status, text.slice(0, 300));
    }),
  );

  return { sent, invalidTokens };
}

/** True when the user's quiet hours cover the current UTC hour. */
export function inQuietHours(start: number | null, end: number | null, hour = new Date().getUTCHours()) {
  if (start === null || end === null || start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

/**
 * Delivers a categorised notification to one user, honouring their category
 * switches and quiet hours. Safe to call from any server function.
 */
export async function notifyUser(userId: string, message: PushMessage) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: prefs } = await supabaseAdmin
    .from("push_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (prefs) {
    if ((prefs as Record<string, unknown>)[message.category] === false) return { sent: 0, skipped: "category" };
    if (inQuietHours(prefs.quiet_hours_start, prefs.quiet_hours_end)) {
      return { sent: 0, skipped: "quiet_hours" };
    }
  }

  const { data: devices } = await supabaseAdmin
    .from("push_devices")
    .select("token")
    .eq("user_id", userId);

  const tokens = (devices ?? []).map((d) => d.token);
  if (!tokens.length) return { sent: 0, skipped: "no_devices" };

  const { sent, invalidTokens } = await sendPushToTokens(tokens, message);
  if (invalidTokens.length) {
    await supabaseAdmin.from("push_devices").delete().in("token", invalidTokens);
  }
  return { sent };
}
