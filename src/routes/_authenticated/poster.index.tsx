import { createFileRoute } from "@tanstack/react-router";
import { PosterScreen } from "@/screens/poster";

export const Route = createFileRoute("/_authenticated/poster/")({
  head: () => ({
    meta: [
      { title: "Poster — Zentry Qor" },
      {
        name: "description",
        content:
          "Queue posts to TikTok, Instagram Reels, and YouTube Shorts from one workspace.",
      },
    ],
  }),
  component: PosterScreen,
});
