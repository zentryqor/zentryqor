import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/public/v1/text")({
  server: {
    handlers: {
      OPTIONS: async () => {
        const { corsPreflight } = await import("@/lib/api-auth.server");
        return corsPreflight();
      },
      POST: async ({ request }) => {
        const { authenticateApiKey, apiJson, apiJsonError } = await import("@/lib/api-auth.server");
        const { spendCredits, refundCredits, callOpenRouterText, TEXT_COST } = await import("@/lib/api-ai.server");

        const auth = await authenticateApiKey(request);
        if (!auth) return apiJsonError(401, "Invalid or missing API key.");

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return apiJsonError(400, "Body must be valid JSON.");
        }

        const parsed = z
          .object({ prompt: z.string().min(1).max(8000), system: z.string().max(2000).optional() })
          .safeParse(body);
        if (!parsed.success) return apiJsonError(400, parsed.error.issues[0]?.message ?? "Invalid input");

        const { enforceRateLimit, RateLimitError } = await import("@/lib/security.server");
        try {
          await enforceRateLimit(`api-text:${auth.userId}`, 30, 60, "Too many text requests");
        } catch (e) {
          if (e instanceof RateLimitError) return apiJsonError(429, e.message, { resetAt: e.resetAt });
          throw e;
        }

        let usage;
        try {
          usage = await spendCredits(auth.userId, TEXT_COST);
        } catch (e: any) {
          return apiJsonError(e.status ?? 400, e.message);
        }

        try {
          const text = await callOpenRouterText(parsed.data.prompt, parsed.data.system);
          return apiJson({ text, usage: { ...usage, cost: TEXT_COST } });
        } catch (e: any) {
          await refundCredits(auth.userId, TEXT_COST);
          return apiJsonError(e.status ?? 500, e.message ?? "Generation failed");
        }
      },
    },
  },
});
