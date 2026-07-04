import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const listPublicGallery = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ limit: z.number().int().min(1).max(60).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const supabase = publicClient() as any;
    const { data: items } = await supabase
      .from("gallery_items")
      .select("id, kind, prompt, image_url, output_text, title, created_at, user_id")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 30);
    return (items ?? []) as Array<{
      id: string;
      kind: "text" | "image";
      prompt: string;
      image_url: string | null;
      output_text: string | null;
      title: string | null;
      created_at: string;
      user_id: string;
    }>;
  });

export const getGalleryItem = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = publicClient() as any;
    const { data: item } = await supabase
      .from("gallery_items")
      .select("id, kind, prompt, image_url, output_text, title, created_at, user_id, is_public")
      .eq("id", data.id)
      .eq("is_public", true)
      .maybeSingle();
    return item as {
      id: string;
      kind: "text" | "image";
      prompt: string;
      image_url: string | null;
      output_text: string | null;
      title: string | null;
      created_at: string;
      user_id: string;
      is_public: boolean;
    } | null;
  });

export const shareToGallery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        kind: z.enum(["text", "image"]),
        prompt: z.string().trim().min(1).max(4000),
        outputText: z.string().max(20000).optional(),
        imageUrl: z.string().max(4000).optional(),
        title: z.string().trim().max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("gallery_items")
      .insert({
        user_id: context.userId,
        kind: data.kind,
        prompt: data.prompt,
        output_text: data.outputText ?? null,
        image_url: data.imageUrl ?? null,
        title: data.title ?? null,
        is_public: true,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteMyGalleryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("gallery_items")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
