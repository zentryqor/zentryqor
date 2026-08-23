import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAppwriteAuth } from "@/integrations/appwrite/auth-middleware";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(6000),
});

export const chatWithZentry = createServerFn({ method: "POST" })
  .middleware([requireAppwriteAuth])
  .inputValidator((input) =>
    z
      .object({
        messages: z.array(MessageSchema).min(1).max(30),
        model: z.enum(["zentry-qor-flash", "zentry-qor-basic", "zentry-qor-pro"]),
        toolContext: z.string().max(1200).optional(),
        channelContext: z.string().max(1200).optional(),
        conversationId: z.string().uuid().optional(),
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
    }${
      data.channelContext
        ? `\n\nThe creator has connected these YouTube channels to Zentry Poster. Use this when they ask about "my channel":\n${data.channelContext}`
        : ""
    }`;

    try {
      const text = await runChat(
        [{ role: "system" as const, content: system }, ...data.messages],
        data.model,
      );

      // Persist the conversation so the creator can reopen it later.
      let conversationId = data.conversationId ?? null;
      const lastUser = [...data.messages].reverse().find((m) => m.role === "user");

      if (conversationId) {
        const { data: owned, error: ownedError } = await context.supabase
          .from("chat_conversations")
          .select("id")
          .eq("id", conversationId)
          .eq("user_id", context.userId)
          .maybeSingle();
        if (ownedError) console.error("chat conversation lookup failed", ownedError);
        if (!owned) conversationId = null;
      }

      if (!conversationId) {
        const title = (lastUser?.content ?? "New chat").slice(0, 80);
        const { data: created, error: createError } = await context.supabase
          .from("chat_conversations")
          .insert({ user_id: context.userId, title, model: data.model })
          .select("id")
          .single();
        if (createError) console.error("chat conversation create failed", createError);
        conversationId = created?.id ?? null;
      }

      if (conversationId) {
        const rows = [
          ...(lastUser
            ? [
                {
                  conversation_id: conversationId,
                  user_id: context.userId,
                  role: "user" as const,
                  content: lastUser.content,
                },
              ]
            : []),
          {
            conversation_id: conversationId,
            user_id: context.userId,
            role: "assistant" as const,
            content: text,
          },
        ];
        const { error: msgError } = await context.supabase.from("chat_messages").insert(rows);
        if (msgError) console.error("chat message persist failed", msgError);
        const { error: touchError } = await context.supabase
          .from("chat_conversations")
          .update({ updated_at: new Date().toISOString(), model: data.model })
          .eq("id", conversationId)
          .eq("user_id", context.userId);
        if (touchError) console.error("chat conversation touch failed", touchError);
      }

      return { text, cost: CHAT_COST, usage, conversationId };
    } catch (e) {
      await refundChatCredits(context.supabase, context.userId);
      throw e;
    }
  });
