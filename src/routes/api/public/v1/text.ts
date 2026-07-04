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
        const { authenticateApiKey, apiJson, apiJsonError, logApiUsage } = await import("@/lib/api-auth.server");
        const { spendCredits, refundCredits, callOpenRouterText, TEXT_COST } = await import("@/lib/api-ai.server");

        const start = Date.now();
        const auth = await authenticateApiKey(request);
        if (!auth) return apiJsonError(401, "Invalid or missing API key.");

        const log = (status: number, cost: number, error?: string) =>
          logApiUsage({
            userId: auth.userId,
            apiKeyId: auth.keyId,
            endpoint: "/v1/text",
            method: "POST",
            status,
            creditsCost: cost,
            latencyMs: Date.now() - start,
            errorMessage: error ?? null,
          });

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          await log(400, 0, "Invalid JSON");
          return apiJsonError(400, "Body must be valid JSON.");
        }

        const parsed = z
          .object({ prompt: z.string().min(1).max(8000), system: z.string().max(2000).optional() })
          .safeParse(body);
        if (!parsed.success) {
          const msg = parsed.error.issues[0]?.message ?? "Invalid input";
          await log(400, 0, msg);
          return apiJsonError(400, msg);
        }

        const { enforceRateLimit, RateLimitError } = await import("@/lib/security.server");
        try {
          await enforceRateLimit(`api-text:${auth.userId}`, 30, 60, "Too many text requests");
        } catch (e) {
          if (e instanceof RateLimitError) {
            await log(429, 0, e.message);
            return apiJsonError(429, e.message, { resetAt: e.resetAt });
          }
          throw e;
        }

        let usage;
        try {
          usage = await spendCredits(auth.userId, TEXT_COST);
        } catch (e: any) {
          const status = e.status ?? 400;
          await log(status, 0, e.message);
          return apiJsonError(status, e.message);
        }

        try {
          const text = await callOpenRouterText(parsed.data.prompt, parsed.data.system);
          await log(200, TEXT_COST);
          return apiJson({ text, usage: { ...usage, cost: TEXT_COST } });
        } catch (e: any) {
          await refundCredits(auth.userId, TEXT_COST);
          const status = e.status ?? 500;
          await log(status, 0, e.message ?? "Generation failed");
          return apiJsonError(status, e.message ?? "Generation failed");
        }
      },
    },
  },
});
