import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LibraryGeneration = {
  id: string;
  user_id: string;
  folder_id: string | null;
  parent_id: string | null;
  tool_id: string;
  tool_name: string | null;
  kind: "text" | "image";
  prompt: string;
  system_prompt: string | null;
  input: string | null;
  output_text: string | null;
  output_image: string | null;
  aspect_ratio: string | null;
  is_favorite: boolean;
  credits_cost: number | null;
  created_at: string;
  updated_at: string;
};

export type LibraryFolder = {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
};

// -------- Folders --------

export const listFolders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("generation_folders")
      .select("id, name, color, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as LibraryFolder[];
  });

export const createFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        name: z.string().trim().min(1).max(60),
        color: z.string().max(20).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("generation_folders")
      .insert({ user_id: context.userId, name: data.name, color: data.color ?? null })
      .select("id, name, color, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row as LibraryFolder;
  });

export const renameFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ id: z.string().uuid(), name: z.string().trim().min(1).max(60) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("generation_folders")
      .update({ name: data.name })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("generation_folders")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Generations --------

export const listGenerations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        folderId: z.string().uuid().nullable().optional(),
        favoritesOnly: z.boolean().optional(),
        kind: z.enum(["text", "image"]).optional(),
        limit: z.number().int().min(1).max(200).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = (context.supabase as any)
      .from("generations")
      .select(
        "id, folder_id, parent_id, tool_id, tool_name, kind, prompt, output_text, output_image, aspect_ratio, is_favorite, credits_cost, created_at, updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (data.folderId === null) q = q.is("folder_id", null);
    else if (data.folderId) q = q.eq("folder_id", data.folderId);
    if (data.favoritesOnly) q = q.eq("is_favorite", true);
    if (data.kind) q = q.eq("kind", data.kind);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as LibraryGeneration[];
  });

export const getGeneration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("generations")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    // Walk up to root, then collect all descendants via parent_id.
    let rootId = row.id as string;
    let current = row;
    // Follow parents up (bounded)
    for (let i = 0; i < 30 && current.parent_id; i++) {
      const { data: p } = await (context.supabase as any)
        .from("generations")
        .select("*")
        .eq("id", current.parent_id)
        .maybeSingle();
      if (!p) break;
      current = p;
      rootId = p.id;
    }
    // Fetch all versions in the tree by BFS
    const versions: LibraryGeneration[] = [current as LibraryGeneration];
    const queue: string[] = [rootId];
    while (queue.length) {
      const next = queue.shift()!;
      const { data: children } = await (context.supabase as any)
        .from("generations")
        .select("*")
        .eq("parent_id", next)
        .order("created_at", { ascending: true });
      for (const c of children ?? []) {
        versions.push(c as LibraryGeneration);
        queue.push(c.id as string);
      }
    }
    return {
      item: row as LibraryGeneration,
      versions: versions.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    };
  });

export const saveGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        toolId: z.string().min(1).max(60),
        toolName: z.string().max(120).optional(),
        kind: z.enum(["text", "image"]),
        prompt: z.string().min(1).max(8000),
        systemPrompt: z.string().max(4000).optional(),
        input: z.string().max(8000).optional(),
        outputText: z.string().max(50000).optional(),
        outputImage: z.string().max(4_000_000).optional(),
        aspectRatio: z.string().max(20).optional(),
        creditsCost: z.number().int().optional(),
        parentId: z.string().uuid().optional(),
        folderId: z.string().uuid().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("generations")
      .insert({
        user_id: context.userId,
        tool_id: data.toolId,
        tool_name: data.toolName ?? null,
        kind: data.kind,
        prompt: data.prompt,
        system_prompt: data.systemPrompt ?? null,
        input: data.input ?? null,
        output_text: data.outputText ?? null,
        output_image: data.outputImage ?? null,
        aspect_ratio: data.aspectRatio ?? null,
        credits_cost: data.creditsCost ?? null,
        parent_id: data.parentId ?? null,
        folder_id: data.folderId ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), value: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("generations")
      .update({ is_favorite: data.value })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const moveGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ id: z.string().uuid(), folderId: z.string().uuid().nullable() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("generations")
      .update({ folder_id: data.folderId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("generations")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
