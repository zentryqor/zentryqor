import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function userClient(ctx: ToolContext) {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "search_assets",
  title: "Search editing assets",
  description:
    "Search Zentry Qor's asset vault (LUTs, overlays, sound FX, templates, fonts, etc.) by keyword or category. Returns matching asset names, descriptions, category, tags, and a direct download link the user can click to download the file. Use this whenever the user asks for an editing asset, overlay, LUT, sound effect, template, or similar resource.",
  inputSchema: {
    query: z
      .string()
      .max(200)
      .optional()
      .describe("Free-text search across title, description, and tags. Omit to browse."),
    category: z
      .string()
      .max(100)
      .optional()
      .describe("Optional exact category filter (e.g. 'LUT', 'Overlay', 'SFX', 'Template')."),
    limit: z.number().int().min(1).max(20).default(5).describe("Max results to return."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ query, category, limit }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }

    const supabase = userClient(ctx);
    let q = supabase
      .from("assets")
      .select("id, title, description, category, tags, file_name, premium_only, mime_type, size_bytes")
      .limit(limit);

    if (category) q = q.eq("category", category);
    if (query && query.trim()) {
      const term = `%${query.trim().replace(/[%_]/g, "")}%`;
      q = q.or(`title.ilike.${term},description.ilike.${term}`);
    }

    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: `Search failed: ${error.message}` }], isError: true };
    }
    if (!data || data.length === 0) {
      return { content: [{ type: "text", text: "No matching assets found." }] };
    }

    const origin = process.env.SITE_URL ?? "https://zentryqor.lovable.app";

    const lines = data.map((a, i) => {
      const detailUrl = `${origin}/assets/${a.id}`;
      const sizeMb = a.size_bytes ? ` · ${(Number(a.size_bytes) / 1_048_576).toFixed(1)} MB` : "";
      const premium = a.premium_only ? " · 🔒 Premium" : "";
      const tags = Array.isArray(a.tags) && a.tags.length ? `\n   Tags: ${a.tags.join(", ")}` : "";
      return `${i + 1}. **${a.title}** — ${a.category ?? "Asset"}${premium}${sizeMb}
   ${a.description ?? "No description."}${tags}
   ⬇️ Download: ${detailUrl}`;
    });

    return {
      content: [
        {
          type: "text",
          text: `Found ${data.length} asset${data.length === 1 ? "" : "s"}:\n\n${lines.join("\n\n")}\n\nClick a download link to open the asset page and download the file.`,
        },
      ],
      structuredContent: {
        assets: data.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          category: a.category,
          tags: a.tags,
          file_name: a.file_name,
          mime_type: a.mime_type,
          size_bytes: a.size_bytes,
          premium_only: a.premium_only,
          download_url: `${origin}/assets/${a.id}`,
        })),
      },
    };
  },
});
