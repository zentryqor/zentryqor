import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AiStudioScreen } from "@/screens/ai-studio";

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({
    meta: [
      { title: "AI Studio — Zentry Qor" },
      {
        name: "description",
        content:
          "Nine AI tools for creators — captions, hooks, scripts, thumbnails, trends, and more. Each tool runs in seconds and tells you exactly what it costs in credits.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) =>
    z.object({ tool: z.string().optional(), prompt: z.string().optional(), chat: z.string().optional() }).parse(s),
  component: AiStudioScreen,
});
