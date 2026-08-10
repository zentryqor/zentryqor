// Server-only: a short-lived publishable-key Supabase client used ONLY to
// verify email/password credentials.
//
// IMPORTANT: never call auth.signInWithPassword() on the shared service-role
// client (supabaseAdmin) — it stores the resulting user session on that client
// instance, so every later PostgREST call is made as that user instead of the
// service role and starts failing row-level security.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export function createPasswordAuthClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;

  return createClient<Database>(url, key, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        // Opaque sb_* keys are not JWTs — send them only as `apikey`.
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input as RequestInfo, { ...init, headers: h });
      },
    },
  });
}
