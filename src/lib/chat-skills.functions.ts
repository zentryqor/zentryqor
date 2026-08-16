import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CustomSkill = {
  id: string;
  name: string;
  description: string;
  content: string;
};

export const listChatSkills = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CustomSkill[]> => {
    const { data, error } = await context.supabase
      .from("chat_skills")
      .select("id, name, description, content")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as CustomSkill[];
  });

export const createChatSkill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        name: z.string().min(1).max(60),
        description: z.string().max(200).optional(),
        content: z.string().min(1).max(8000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<CustomSkill> => {
    const { data: row, error } = await context.supabase
      .from("chat_skills")
      .insert({
        user_id: context.userId,
        name: data.name.trim(),
        description: (data.description ?? "").trim(),
        content: data.content.trim(),
      })
      .select("id, name, description, content")
      .single();
    if (error) throw new Error(error.message);
    return row as CustomSkill;
  });

export const deleteChatSkill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chat_skills")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
