import { supabase } from "@/integrations/supabase/client";

export type CaptionCut = { start: number; end: number };

export type CaptionProjectRow = {
  id: string;
  name: string;
  video_path: string | null;
  video_name: string | null;
  duration_sec: number | null;
  words: any;
  cuts: any;
  style_id: string | null;
  size_mult: number;
  color_override: string | null;
  font_url: string | null;
  font_family: string | null;
  updated_at: string;
};

export type CaptionFontRow = {
  id: string;
  family: string;
  storage_path: string;
};

const VIDEOS = "caption-projects";
const FONTS = "caption-fonts";

async function uid() {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("You need to be signed in.");
  return id;
}

export async function listCaptionProjects(): Promise<CaptionProjectRow[]> {
  const { data, error } = await supabase
    .from("caption_projects" as any)
    .select(
      "id, name, video_path, video_name, duration_sec, words, cuts, style_id, size_mult, color_override, font_url, font_family, updated_at",
    )
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CaptionProjectRow[];
}

/** Uploads the source clip once so the project can be reopened later. */
export async function uploadProjectVideo(file: File): Promise<string> {
  const userId = await uid();
  const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(VIDEOS)
    .upload(path, file, { contentType: file.type || "video/mp4", upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export async function signedVideoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(VIDEOS).createSignedUrl(path, 60 * 60 * 6);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Could not open project video");
  return data.signedUrl;
}

export async function saveCaptionProject(input: {
  id?: string | null;
  name: string;
  videoPath: string | null;
  videoName: string | null;
  durationSec: number | null;
  words: unknown;
  cuts: unknown;
  styleId: string;
  sizeMult: number;
  colorOverride: string | null;
  fontUrl: string | null;
  fontFamily: string | null;
}): Promise<string> {
  const userId = await uid();
  const row = {
    user_id: userId,
    name: input.name,
    video_path: input.videoPath,
    video_name: input.videoName,
    duration_sec: input.durationSec,
    words: input.words,
    cuts: input.cuts,
    style_id: input.styleId,
    size_mult: input.sizeMult,
    color_override: input.colorOverride,
    font_url: input.fontUrl,
    font_family: input.fontFamily,
  };
  if (input.id) {
    const { error } = await supabase
      .from("caption_projects" as any)
      .update(row)
      .eq("id", input.id);
    if (error) throw new Error(error.message);
    return input.id;
  }
  const { data, error } = await supabase
    .from("caption_projects" as any)
    .insert(row)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return (data as any).id as string;
}

export async function deleteCaptionProject(p: CaptionProjectRow) {
  if (p.video_path) {
    await supabase.storage.from(VIDEOS).remove([p.video_path]);
  }
  const { error } = await supabase.from("caption_projects" as any).delete().eq("id", p.id);
  if (error) throw new Error(error.message);
}

// ---------- Fonts ----------

export async function listCaptionFonts(): Promise<CaptionFontRow[]> {
  const { data, error } = await supabase
    .from("caption_fonts" as any)
    .select("id, family, storage_path")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CaptionFontRow[];
}

export async function uploadCaptionFont(file: File, family: string): Promise<CaptionFontRow> {
  const userId = await uid();
  const ext = (file.name.split(".").pop() || "ttf").toLowerCase();
  if (!["ttf", "otf", "woff", "woff2"].includes(ext)) {
    throw new Error("Use a TTF, OTF, WOFF or WOFF2 font file.");
  }
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from(FONTS).upload(path, file, { upsert: false });
  if (upErr) throw new Error(upErr.message);
  const { data, error } = await supabase
    .from("caption_fonts" as any)
    .insert({ user_id: userId, family, storage_path: path })
    .select("id, family, storage_path")
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as CaptionFontRow;
}

export async function signedFontUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(FONTS).createSignedUrl(path, 60 * 60 * 12);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Could not load font");
  return data.signedUrl;
}

export async function deleteCaptionFont(f: CaptionFontRow) {
  await supabase.storage.from(FONTS).remove([f.storage_path]);
  const { error } = await supabase.from("caption_fonts" as any).delete().eq("id", f.id);
  if (error) throw new Error(error.message);
}

/** Registers a remote font file with the document so canvas + DOM can use it. */
const loaded = new Set<string>();
export async function ensureFontLoaded(family: string, url: string) {
  const key = `${family}|${url}`;
  if (loaded.has(key)) return;
  const face = new FontFace(family, `url(${url})`);
  await face.load();
  (document as any).fonts.add(face);
  loaded.add(key);
}
