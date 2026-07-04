import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/v1/credits")({
  server: {
    handlers: {
      OPTIONS: async () => {
        const { corsPreflight } = await import("@/lib/api-auth.server");
        return corsPreflight();
      },
      GET: async ({ request }) => {
        const { authenticateApiKey, apiJson, apiJsonError } = await import("@/lib/api-auth.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const auth = await authenticateApiKey(request);
        if (!auth) return apiJsonError(401, "Invalid or missing API key.");

        const day = new Date().toISOString().slice(0, 10);
        const { data } = await supabaseAdmin
          .from("ai_credit_usage")
          .select("used")
          .eq("user_id", auth.userId)
          .eq("day", day)
          .maybeSingle();
        const limit = 1000;
        const used = data?.used ?? 0;
        return apiJson({
          limit,
          used,
          remaining: Math.max(0, limit - used),
          costs: { text: 10, image: 30 },
        });
      },
    },
  },
});
