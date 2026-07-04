import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/public/v1/image")({
  server: {
    handlers: {
      OPTIONS: async () => {
        const { corsPreflight } = await import("@/lib/api-auth.server");
        return corsPreflight();
      },
      POST: async ({ request }) => {
        const { authenticateApiKey, apiJson, apiJsonError } = await import("@/lib/api-auth.server");
        const { spendCredits, refundCredits, callImageGen, IMAGE_COST } = await import("@/lib/api-ai.server");

        const auth = await authenticateApiKey(request);
        if (!auth) return apiJsonError(401, "Invalid or missing API key.");

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return apiJsonError(400, "Body must be valid JSON.");
        }

        const parsed = z
          .object({
            prompt: z.string().min(1).max(2000),
            aspect_ratio: z.enum(["16:9", "9:16", "4:3", "3:4"]).default("16:9"),
          })
          .safeParse(body);
        if (!parsed.success) return apiJsonError(400, parsed.error.issues[0]?.message ?? "Invalid input");

        const { enforceRateLimit, RateLimitError } = await import("@/lib/security.server");
        try {
          await enforceRateLimit(`api-image:${auth.userId}`, 15, 60, "Too many image requests");
        } catch (e) {
          if (e instanceof RateLimitError) return apiJsonError(429, e.message, { resetAt: e.resetAt });
          throw e;
        }

        let usage;
        try {
          usage = await spendCredits(auth.userId, IMAGE_COST);
        } catch (e: any) {
          return apiJsonError(e.status ?? 400, e.message);
        }

        try {
          const image = await callImageGen(parsed.data.prompt, parsed.data.aspect_ratio);
          return apiJson({ image, usage: { ...usage, cost: IMAGE_COST } });
        } catch (e: any) {
          await refundCredits(auth.userId, IMAGE_COST);
          return apiJsonError(e.status ?? 500, e.message ?? "Generation failed");
        }
      },
    },
  },
});
