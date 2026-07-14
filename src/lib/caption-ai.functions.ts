import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AAI = "https://api.assemblyai.com/v2";

function keyOrThrow() {
  const k = process.env.ASSEMBLYAI_API_KEY;
  if (!k) throw new Error("AssemblyAI is not configured on this server.");
  return k;
}

/**
 * Uploads a base64-encoded audio/video blob to AssemblyAI and starts a
 * transcription job with word-level timestamps. Returns the transcript id.
 */
export const startTranscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        // base64 (no data: prefix). Keep under ~30MB raw to stay within RPC limits.
        base64: z.string().min(100),
        contentType: z.string().default("video/mp4"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const key = keyOrThrow();
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));

    const uploadRes = await fetch(`${AAI}/upload`, {
      method: "POST",
      headers: {
        authorization: key,
        "content-type": "application/octet-stream",
      },
      body: bytes,
    });
    if (!uploadRes.ok) {
      throw new Error(`Upload failed: ${uploadRes.status} ${await uploadRes.text().catch(() => "")}`);
    }
    const { upload_url } = (await uploadRes.json()) as { upload_url: string };

    const jobRes = await fetch(`${AAI}/transcript`, {
      method: "POST",
      headers: { authorization: key, "content-type": "application/json" },
      body: JSON.stringify({
        audio_url: upload_url,
        punctuate: true,
        format_text: true,
      }),
    });
    if (!jobRes.ok) {
      throw new Error(`Transcript start failed: ${jobRes.status} ${await jobRes.text().catch(() => "")}`);
    }
    const job = (await jobRes.json()) as { id: string };
    return { id: job.id };
  });

export type CaptionWord = { text: string; start: number; end: number };

export const pollTranscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().min(4) }).parse(input))
  .handler(async ({ data }) => {
    const key = keyOrThrow();
    const res = await fetch(`${AAI}/transcript/${data.id}`, {
      headers: { authorization: key },
    });
    if (!res.ok) throw new Error(`Poll failed: ${res.status}`);
    const j = (await res.json()) as {
      status: "queued" | "processing" | "completed" | "error";
      error?: string;
      text?: string;
      words?: Array<{ text: string; start: number; end: number }>;
    };
    if (j.status === "error") throw new Error(j.error ?? "Transcription failed");
    return {
      status: j.status,
      text: j.text ?? "",
      words: (j.words ?? []) as CaptionWord[],
    };
  });
