import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(6000),
});

export const chatWithZentry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        messages: z.array(MessageSchema).min(1).max(30),
        model: z.enum(["zentry-qor-flash", "zentry-qor-basic", "zentry-qor-pro"]),
        toolContext: z.string().max(1200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { enforceRateLimit } = await import("@/lib/security.server");
    await enforceRateLimit(`ai-chat:${context.userId}`, 30, 60, "Too many chat messages");
    const { runChat, spendChatCredits, refundChatCredits, CHAT_COST } = await import(
      "@/lib/chat.server"
    );

    const usage = await spendChatCredits(context.supabase, context.userId);

    const system = `You are Zentry Qor, an expert creator co-pilot. You help with video editing, social media growth, and going viral on TikTok, Reels, YouTube Shorts and YouTube.
Be concrete and actionable: give hooks, structures, timings, editing steps, and examples the creator can use immediately.
Use short markdown sections and bullet lists. Never invent fake statistics.${
      data.toolContext ? `\n\nThe creator selected this Zentry tool — behave like it:\n${data.toolContext}` : ""
    }`;

    try {
      const text = await runChat(
        [{ role: "system" as const, content: system }, ...data.messages],
        data.model,
      );
      return { text, cost: CHAT_COST, usage };
    } catch (e) {
      await refundChatCredits(context.supabase, context.userId);
      throw e;
    }
  });
