import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "generate_image",
  title: "Generate AI image",
  description: "Generate an image with Zentry Qor's AI (returns a base64 data URL). Costs 30 AI credits per call.",
  inputSchema: {
    prompt: z.string().min(1).max(2000).describe("Describe the image to generate."),
    aspect_ratio: z.enum(["16:9", "9:16", "4:3", "3:4"]).default("16:9").describe("Output aspect ratio."),
  },
  annotations: { readOnlyHint: false, openWorldHint: true },
  handler: async ({ prompt, aspect_ratio }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    try {
      const { spendCredits, refundCredits, callImageGen, IMAGE_COST } = await import("@/lib/api-ai.server");
      await spendCredits(ctx.getUserId(), IMAGE_COST);
      try {
        const image = await callImageGen(prompt, aspect_ratio);
        return {
          content: [{ type: "text", text: `Image generated (${aspect_ratio}).` }],
          structuredContent: { image, aspect_ratio },
        };
      } catch (e) {
        await refundCredits(ctx.getUserId(), IMAGE_COST);
        throw e;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Image generation failed";
      return { content: [{ type: "text", text: msg }], isError: true };
    }
  },
});
