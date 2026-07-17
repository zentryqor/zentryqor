import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "generate_text",
  title: "Generate AI text",
  description: "Generate text with Zentry Qor's AI. Costs 10 AI credits per call. Optional system instructions steer the tone.",
  inputSchema: {
    prompt: z.string().min(1).max(8000).describe("The user prompt for the AI."),
    system: z.string().max(2000).optional().describe("Optional system instructions."),
  },
  annotations: { readOnlyHint: false, openWorldHint: true },
  handler: async ({ prompt, system }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    try {
      const { spendCredits, refundCredits, callOpenRouterText, TEXT_COST } = await import("@/lib/api-ai.server");
      await spendCredits(ctx.getUserId(), TEXT_COST);
      try {
        const text = await callOpenRouterText(prompt, system);
        return { content: [{ type: "text", text }] };
      } catch (e) {
        await refundCredits(ctx.getUserId(), TEXT_COST);
        throw e;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Text generation failed";
      return { content: [{ type: "text", text: msg }], isError: true };
    }
  },
});
