import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminAccount = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  roles: string[];
  subscription_status: string | null;
};

export type AdminAssetRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  file_name: string;
  storage_path: string;
  thumbnail_path: string | null;
  thumbnail_url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  premium_only: boolean;
  created_at: string;
};

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error("Failed to verify role");
  if (!(data ?? []).some((r) => r.role === "admin")) {
    throw new Error("Forbidden");
  }
  return supabaseAdmin;
}

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ isAdmin: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    return { isAdmin: (data ?? []).some((r) => r.role === "admin") };
  });

export const adminListAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminAccount[]> => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const [{ data: profiles }, { data: roles }, { data: subs }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, email, display_name, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("subscriptions").select("user_id, status, current_period_end"),
    ]);
    return (profiles ?? []).map((p: any) => ({
      id: p.id,
      email: p.email,
      display_name: p.display_name,
      created_at: p.created_at,
      roles: (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
      subscription_status:
        (subs ?? []).find((s: any) => s.user_id === p.id)?.status ?? null,
    }));
  });

export const adminListAssets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminAssetRow[]> => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("assets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as any[];
    const thumbPaths = rows.map((r) => r.thumbnail_path).filter(Boolean) as string[];
    const urlMap = new Map<string, string>();
    if (thumbPaths.length) {
      const { data: signed } = await supabaseAdmin.storage
        .from("assets")
        .createSignedUrls(thumbPaths, 3600);
      (signed ?? []).forEach((s: any) => {
        if (s.path && s.signedUrl) urlMap.set(s.path, s.signedUrl);
      });
    }
    return rows.map((r) => ({
      ...r,
      thumbnail_url: r.thumbnail_path ? urlMap.get(r.thumbnail_path) ?? null : null,
    })) as AdminAssetRow[];
  });

const uploadMetaSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().min(1).max(64),
  tags: z.array(z.string().min(1).max(64)).max(20),
  premium_only: z.boolean(),
  file_name: z.string().min(1).max(255),
  mime_type: z.string().max(255).optional().nullable(),
});

export const adminUploadAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: FormData) => {
    if (!(data instanceof FormData)) throw new Error("Expected FormData");
    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("Missing file");
    const metaRaw = data.get("meta");
    if (typeof metaRaw !== "string") throw new Error("Missing meta");
    const meta = uploadMetaSchema.parse(JSON.parse(metaRaw));
    const thumbnailRaw = data.get("thumbnail");
    const thumbnail =
      thumbnailRaw instanceof File && thumbnailRaw.size > 0 ? thumbnailRaw : null;
    return { file, meta, thumbnail };
  })
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { file, meta, thumbnail } = data;
    const safeName = meta.file_name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${context.userId}/${Date.now()}-${safeName}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: upErr } = await supabaseAdmin.storage
      .from("assets")
      .upload(path, new Uint8Array(arrayBuffer), {
        contentType: meta.mime_type ?? "application/octet-stream",
      });
    if (upErr) throw upErr;

    let thumbnailPath: string | null = null;
    if (thumbnail) {
      const safeThumb = thumbnail.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      thumbnailPath = `${context.userId}/thumbnails/${Date.now()}-${safeThumb}`;
      const thumbBuf = await thumbnail.arrayBuffer();
      const { error: thumbErr } = await supabaseAdmin.storage
        .from("assets")
        .upload(thumbnailPath, new Uint8Array(thumbBuf), {
          contentType: thumbnail.type || "image/*",
        });
      if (thumbErr) {
        await supabaseAdmin.storage.from("assets").remove([path]);
        throw thumbErr;
      }
    }

    const { error: insErr } = await supabaseAdmin.from("assets").insert({
      title: meta.title.trim(),
      description: meta.description?.trim() || null,
      category: meta.category.trim() || "general",
      tags: meta.tags,
      storage_path: path,
      thumbnail_path: thumbnailPath,
      file_name: meta.file_name,
      mime_type: meta.mime_type ?? null,
      size_bytes: file.size,
      premium_only: meta.premium_only,
      uploaded_by: context.userId,
    });
    if (insErr) {
      await supabaseAdmin.storage
        .from("assets")
        .remove(thumbnailPath ? [path, thumbnailPath] : [path]);
      throw insErr;
    }
    return { ok: true };
  });

export const adminDeleteAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { data: row, error: rowErr } = await supabaseAdmin
      .from("assets")
      .select("storage_path, thumbnail_path")
      .eq("id", data.id)
      .maybeSingle();
    if (rowErr) throw rowErr;
    if (!row) throw new Error("Asset not found");
    const toRemove = [row.storage_path, row.thumbnail_path].filter(Boolean) as string[];
    if (toRemove.length) await supabaseAdmin.storage.from("assets").remove(toRemove);
    const { error } = await supabaseAdmin.from("assets").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminGetAssetSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ url: string }> => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { data: row, error: rowErr } = await supabaseAdmin
      .from("assets")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (rowErr) throw rowErr;
    if (!row) throw new Error("Asset not found");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("assets")
      .createSignedUrl(row.storage_path, 60);
    if (error || !signed) throw error ?? new Error("Could not sign URL");
    return { url: signed.signedUrl };
  });
