import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const KEY_PREFIX = "zqk_live_";

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

function generateRawKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return KEY_PREFIX + bytesToHex(bytes);
}

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("api_keys")
      .select("id, name, key_prefix, last_used_at, revoked_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ name: z.string().trim().min(1).max(60) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: premium } = await supabaseAdmin.rpc("is_premium", {
      _user_id: context.userId,
    });
    if (!premium) {
      throw new Error("Premium membership required to create API keys.");
    }

    const { count } = await context.supabase
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .is("revoked_at", null);
    if ((count ?? 0) >= 10) {
      throw new Error("You've reached the maximum of 10 active API keys. Revoke one first.");
    }

    const rawKey = generateRawKey();
    const keyHash = await sha256Hex(rawKey);
    const keyPrefix = rawKey.slice(0, KEY_PREFIX.length + 6);

    const { data: inserted, error } = await context.supabase
      .from("api_keys")
      .insert({
        user_id: context.userId,
        name: data.name,
        key_prefix: keyPrefix,
        key_hash: keyHash,
      })
      .select("id, name, key_prefix, created_at")
      .single();
    if (error) throw new Error(error.message);

    return { key: rawKey, record: inserted };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .is("revoked_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
