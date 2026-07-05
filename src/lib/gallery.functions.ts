import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days


function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

async function signImageUrls<T extends { image_url: string | null }>(items: T[]): Promise<T[]> {
  const needsSigning = items.filter(
    (it) => it.image_url && !/^https?:\/\//i.test(it.image_url) && !it.image_url.startsWith("data:"),
  );
  if (needsSigning.length === 0) return items;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const paths = needsSigning.map((it) => it.image_url as string);
  const { data: signed } = await (supabaseAdmin as any).storage
    .from("gallery")
    .createSignedUrls(paths, SIGNED_URL_TTL);
  const map = new Map<string, string>();
  for (let i = 0; i < paths.length; i++) {
    const s = signed?.[i]?.signedUrl;
    if (s) map.set(paths[i], s);
  }
  return items.map((it) =>
    it.image_url && map.has(it.image_url) ? { ...it, image_url: map.get(it.image_url)! } : it,
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
    const signed = await signImageUrls((items ?? []) as any[]);
    return signed as Array<{
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
    if (!item) return null;
    const [signed] = await signImageUrls([item as any]);
    return signed as {
      id: string;
      kind: "text" | "image";
      prompt: string;
      image_url: string | null;
      output_text: string | null;
      title: string | null;
      created_at: string;
      user_id: string;
      is_public: boolean;
    };
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
