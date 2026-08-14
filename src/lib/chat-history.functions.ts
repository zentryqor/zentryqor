import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ChatConversation = {
  id: string;
  title: string;
  model: string;
  updatedAt: string;
};

export type StoredChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export const listChatConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ChatConversation[]> => {
    const { data, error } = await context.supabase
      .from("chat_conversations")
      .select("id, title, model, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      title: r.title,
      model: r.model,
      updatedAt: r.updated_at,
    }));
  });

export const getChatConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: convo, error: convoError } = await context.supabase
      .from("chat_conversations")
      .select("id, title, model, updated_at")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (convoError) throw new Error(convoError.message);
    if (!convo) throw new Error("Conversation not found");

    const { data: rows, error } = await context.supabase
      .from("chat_messages")
      .select("id, role, content")
      .eq("conversation_id", data.id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    return {
      conversation: {
        id: convo.id,
        title: convo.title,
        model: convo.model,
        updatedAt: convo.updated_at,
      } as ChatConversation,
      messages: (rows ?? []) as StoredChatMessage[],
    };
  });

export const createChatConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ title: z.string().max(120).optional(), model: z.string().max(40).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<ChatConversation> => {
    const { data: row, error } = await context.supabase
      .from("chat_conversations")
      .insert({
        user_id: context.userId,
        title: data.title?.trim() || "New chat",
        model: data.model || "zentry-qor-flash",
      })
      .select("id, title, model, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, title: row.title, model: row.model, updatedAt: row.updated_at };
  });

export const renameChatConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), title: z.string().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chat_conversations")
      .update({ title: data.title.trim(), updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteChatConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chat_conversations")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
