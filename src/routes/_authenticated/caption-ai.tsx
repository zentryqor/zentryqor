import { createFileRoute } from "@tanstack/react-router";
import { CaptionAiScreen } from "@/screens/caption-ai";

export const Route = createFileRoute("/_authenticated/caption-ai")({
  head: () => ({
    meta: [
      { title: "CaptionAI — Zentry Qor" },
      {
        name: "description",
        content:
          "Upload a short clip, edit the transcript and timings, pick from 20+ caption styles, and export a captioned video.",
      },
    ],
  }),
  component: CaptionAiScreen,
});
