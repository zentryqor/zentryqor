// Thumbnail/image generation via Lovable AI Gateway.
// Keeps the same export name/signature so existing callers don't need changes.
export type GoogleImageAspectRatio = "16:9" | "9:16" | "4:3" | "3:4";

const LOVABLE_IMAGE_URL = "https://ai.gateway.lovable.dev/v1/images/generations";
const DEFAULT_MODEL = "google/gemini-3-pro-image";

export class GoogleImageQuotaError extends Error {
  status = 429;
}

export async function generateGoogleImageDataUrl({
  prompt,
  aspectRatio,
}: {
  prompt: string;
  aspectRatio: GoogleImageAspectRatio;
}) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const model = process.env.LOVABLE_IMAGE_MODEL?.trim() || DEFAULT_MODEL;

  const res = await fetch(LOVABLE_IMAGE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: `${prompt}\n\nGenerate the image with aspect ratio ${aspectRatio}.`,
        },
      ],
      modalities: ["image", "text"],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    const message = text.replace(/\s+/g, " ").trim().slice(0, 500);
    if (res.status === 429) {
      throw new GoogleImageQuotaError(
        `Lovable AI is rate-limited right now. Please retry shortly. Details: ${message}`,
      );
    }
    if (res.status === 402) {
      const err: any = new Error(
        "Lovable AI credits exhausted. Add credits in Workspace Settings to continue generating images.",
      );
      err.status = 402;
      throw err;
    }
    throw new Error(`Image generation failed (${res.status}): ${message}`);
  }

  const json = await res.json();
  const b64: string | undefined = json?.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("Image generation failed: no image returned");
  }
  return `data:image/png;base64,${b64}`;
}
