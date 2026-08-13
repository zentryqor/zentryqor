import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CaptionVariant = {
  style: string;
  title: string;
  description: string;
  hashtags: string[];
};

const CAPTION_STYLES = [
  { id: "hook", label: "Hook-driven", brief: "Open with a scroll-stopping question or bold claim. Punchy, curiosity-gap first line." },
  { id: "story", label: "Story", brief: "Mini-narrative POV. First-person. Feels human, not marketing." },
  { id: "cta", label: "CTA-heavy", brief: "Drives comments / follows. Clear call-to-action in first two lines." },
  { id: "listicle", label: "Listicle", brief: "3 numbered takeaways. Fast, skimmable, value-dense." },
];

export const generateCaptionVariants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        topic: z.string().min(3).max(1500),
        platform: z.enum(["youtube_shorts", "tiktok", "reels"]).default("youtube_shorts"),
        currentTitle: z.string().max(200).optional(),
        currentDescription: z.string().max(3000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { enforceRateLimit } = await import("@/lib/security.server");
    await enforceRateLimit(
      `caption-studio:${context.userId}`,
      15,
      60,
      "Too many caption requests",
    );

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("AI is not configured on this server");

    const platformNote =
      data.platform === "tiktok"
        ? "TikTok Short (9:16 vertical). Casual, first-person, plenty of hashtags."
        : data.platform === "reels"
          ? "Instagram Reel (9:16 vertical). Aesthetic, emotive, sparse hashtags in first line."
          : "YouTube Short (9:16 vertical, <60s). Search-friendly title, description that helps discovery, always include #shorts.";

    const styleBlock = CAPTION_STYLES.map(
      (s, i) => `${i + 1}. ${s.label} — ${s.brief}`,
    ).join("\n");

    const system = `You are a viral short-form video copywriter. You write titles, descriptions, and hashtags for ${platformNote}
Return ONLY valid minified JSON, no prose, no markdown, no code fences. Schema:
{"variants":[{"style":"Hook-driven","title":"...","description":"...","hashtags":["#tag1","#tag2"]}]}
Rules:
- title <= 90 chars, no quotation marks around the whole title.
- description 1-4 short lines, may include line breaks (\\n).
- 3-6 hashtags each, lowercase, no spaces, always with leading #.
- Never repeat the same variant.`;

    const user = `Video topic / current caption:
"""
${data.topic}
"""
${data.currentTitle ? `Current title (may or may not use): ${data.currentTitle}\n` : ""}Generate exactly 4 variants, one per style, in this order:
${styleBlock}`;

    const res = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://zentryqor.lovable.app",
          "X-Title": "Zentry Qor",
        },
        body: JSON.stringify({
          model: "nvidia/nemotron-3-ultra-550b-a55b:free",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          max_tokens: 1400,
          temperature: 0.85,
          top_p: 0.9,
          stream: false,
          response_format: { type: "json_object" },
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429)
        throw new Error("AI is busy right now — please try again in a moment.");
      throw new Error(`Caption AI ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    const raw: string = json.choices?.[0]?.message?.content ?? "";

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI returned malformed JSON");
      parsed = JSON.parse(m[0]);
    }

    const variants = Array.isArray(parsed?.variants) ? parsed.variants : [];
    const cleaned: CaptionVariant[] = variants
      .map((v: any, i: number) => ({
        style: String(v?.style ?? CAPTION_STYLES[i]?.label ?? "Variant"),
        title: String(v?.title ?? "").slice(0, 100),
        description: String(v?.description ?? "").slice(0, 3000),
        hashtags: Array.isArray(v?.hashtags)
          ? v.hashtags
              .map((h: any) => {
                const s = String(h).trim().replace(/^#*/, "");
                return s ? "#" + s.replace(/\s+/g, "") : "";
              })
              .filter(Boolean)
              .slice(0, 10)
          : [],
      }))
      .filter((v: CaptionVariant) => v.title && v.description);

    if (cleaned.length === 0) throw new Error("AI didn't return usable variants");
    return { variants: cleaned };
  });
