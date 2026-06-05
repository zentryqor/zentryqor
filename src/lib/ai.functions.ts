import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function callOpenRouter(model: string, messages: Array<{ role: string; content: any }>, modalities?: string[]) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

  const body: Record<string, unknown> = { model, messages };
  if (modalities) body.modalities = modalities;

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://zentryqor.lovable.app",
      "X-Title": "Zentry Qor",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

export const generateAiText = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        prompt: z.string().min(1).max(8000),
        system: z.string().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const messages = [
      ...(data.system ? [{ role: "system", content: data.system }] : []),
      { role: "user", content: data.prompt },
    ];
    const json = await callOpenRouter("openai/gpt-oss-120b:free", messages);
    const text: string = json.choices?.[0]?.message?.content ?? "";
    return { text };
  });

export const generateAiImage = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ prompt: z.string().min(1).max(2000) }).parse(input))
  .handler(async ({ data }) => {
    const json = await callOpenRouter(
      "sourceful/riverflow-v2.5-pro:free",
      [{ role: "user", content: data.prompt }],
      ["image", "text"],
    );

    const message = json.choices?.[0]?.message;
    // OpenRouter returns generated images on message.images[].image_url.url
    const images: string[] = (message?.images ?? [])
      .map((img: any) => img?.image_url?.url)
      .filter(Boolean);

    if (images.length === 0) {
      const text = message?.content ?? "No image returned";
      throw new Error(typeof text === "string" ? text : "No image returned");
    }

    return { image: images[0] };
  });
