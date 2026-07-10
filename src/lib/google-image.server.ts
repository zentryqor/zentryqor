export type GoogleImageAspectRatio = "16:9" | "9:16" | "4:3" | "3:4";

const DEFAULT_GOOGLE_IMAGE_MODELS = ["gemini-3.1-flash-image", "gemini-2.5-flash-image"];

export class GoogleImageQuotaError extends Error {
  status = 429;
}

function getImageModels() {
  const configured = process.env.GOOGLE_AI_STUDIO_IMAGE_MODEL?.trim();
  return Array.from(new Set([configured, ...DEFAULT_GOOGLE_IMAGE_MODELS].filter(Boolean))) as string[];
}

function providerMessage(raw: string) {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    return (parsed.error?.message ?? raw).replace(/\s+/g, " ").trim().slice(0, 500);
  } catch {
    return raw.replace(/\s+/g, " ").trim().slice(0, 500);
  }
}

function quotaMessage(details: string) {
  return [
    "Google AI Studio image quota is exhausted or temporarily rate-limited.",
    "Please wait for the quota window to reset, increase your Google AI Studio quota/billing, or save a key from another project.",
    details ? `Details: ${details}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function generateGoogleImageDataUrl({
  prompt,
  aspectRatio,
}: {
  prompt: string;
  aspectRatio: GoogleImageAspectRatio;
}) {
  const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_STUDIO_API_KEY is not configured");

  const quotaErrors: string[] = [];

  for (const model of getImageModels()) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${prompt}\n\nGenerate the image with aspect ratio ${aspectRatio}.` }],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
        },
      }),
    });

    if (!res.ok) {
      const message = providerMessage(await res.text());
      if (res.status === 429) {
        quotaErrors.push(`${model}: ${message}`);
        continue;
      }
      throw new Error(`Image generation failed (${res.status}): ${message}`);
    }

    const json = await res.json();
    const parts = json?.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p: any) => p?.inlineData?.data);
    const b64: string | undefined = imgPart?.inlineData?.data;
    const mime: string = imgPart?.inlineData?.mimeType ?? "image/png";
    if (!b64) {
      const reason = json?.promptFeedback?.blockReason || json?.candidates?.[0]?.finishReason || "No image returned";
      throw new Error(`Image generation failed: ${reason}`);
    }

    return `data:${mime};base64,${b64}`;
  }

  throw new GoogleImageQuotaError(quotaMessage(quotaErrors.join(" | ")));
}