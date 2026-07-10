// Text generation via Google AI Studio (Gemini/Gemma).
const DEFAULT_TEXT_MODEL = "gemma-4-26b-a4b-it";

function getTextApiKeys(): string[] {
  const keys = [
    process.env.GOOGLE_AI_STUDIO_API_KEY,
    process.env.GOOGLE_AI_STUDIO_API_KEY_2,
  ]
    .map((k) => k?.trim())
    .filter(Boolean) as string[];
  return Array.from(new Set(keys));
}

function providerMessage(raw: string) {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    return (parsed.error?.message ?? raw).replace(/\s+/g, " ").trim().slice(0, 500);
  } catch {
    return raw.replace(/\s+/g, " ").trim().slice(0, 500);
  }
}

export async function generateGoogleText({
  prompt,
  system,
}: {
  prompt: string;
  system?: string | null;
}): Promise<string> {
  const apiKeys = getTextApiKeys();
  if (apiKeys.length === 0) throw new Error("GOOGLE_AI_STUDIO_API_KEY is not configured");
  const model = process.env.GOOGLE_AI_STUDIO_TEXT_MODEL?.trim() || DEFAULT_TEXT_MODEL;

  const body: any = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 1024,
    },
  };
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  const quotaErrors: string[] = [];
  for (const apiKey of apiKeys) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const message = providerMessage(await res.text());
      if (res.status === 429) {
        quotaErrors.push(message);
        continue;
      }
      const err: any = new Error(`Text generation failed (${res.status}): ${message}`);
      err.status = res.status;
      throw err;
    }

    const json = await res.json();
    const parts = json?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p: any) => p?.text ?? "").join("").trim();
    if (!text) {
      const reason = json?.promptFeedback?.blockReason || json?.candidates?.[0]?.finishReason || "No text returned";
      throw new Error(`Text generation failed: ${reason}`);
    }
    return text;
  }

  const err: any = new Error(
    `Google AI Studio text quota exhausted on all keys. Details: ${quotaErrors.join(" | ")}`,
  );
  err.status = 429;
  throw err;
}
