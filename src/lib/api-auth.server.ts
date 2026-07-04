import { supabaseAdmin } from "@/integrations/supabase/client.server";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

export type ApiKeyAuth = { userId: string; keyId: string };

export async function logApiUsage(params: {
  userId: string;
  apiKeyId: string | null;
  endpoint: string;
  method: string;
  status: number;
  creditsCost?: number;
  latencyMs?: number;
  errorMessage?: string | null;
}) {
  try {
    await supabaseAdmin.from("api_usage_logs").insert({
      user_id: params.userId,
      api_key_id: params.apiKeyId,
      endpoint: params.endpoint,
      method: params.method,
      status: params.status,
      credits_cost: params.creditsCost ?? 0,
      latency_ms: params.latencyMs ?? null,
      error_message: params.errorMessage ?? null,
    });
  } catch {
    // best-effort logging
  }
}

export async function authenticateApiKey(request: Request): Promise<ApiKeyAuth | null> {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();
  if (!token || !token.startsWith("zqk_")) return null;

  const keyHash = await sha256Hex(token);
  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, user_id, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();
  if (error || !data || data.revoked_at) return null;

  // Fire-and-forget last-used update.
  supabaseAdmin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {}, () => {});

  return { userId: data.user_id, keyId: data.id };
}

export function apiJsonError(status: number, message: string, details?: Record<string, unknown>) {
  return new Response(JSON.stringify({ error: message, ...details }), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

export function apiJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

export function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
