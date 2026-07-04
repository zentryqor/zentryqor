import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export type TemplateRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  kind: "text" | "image";
  prompt: string;
  seo_title: string | null;
  seo_description: string | null;
  cover_image_url: string | null;
  sort_order: number;
};

export const listTemplates = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient() as any;
  const { data } = await supabase
    .from("templates")
    .select("id, slug, title, description, category, kind, prompt, seo_title, seo_description, cover_image_url, sort_order")
    .order("sort_order", { ascending: true });
  return (data ?? []) as TemplateRow[];
});

export const getTemplate = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ slug: z.string().trim().min(1).max(80) }).parse(input))
  .handler(async ({ data }) => {
    const supabase = publicClient() as any;
    const { data: row } = await supabase
      .from("templates")
      .select("id, slug, title, description, category, kind, prompt, seo_title, seo_description, cover_image_url, sort_order")
      .eq("slug", data.slug)
      .maybeSingle();
    return row as TemplateRow | null;
  });
