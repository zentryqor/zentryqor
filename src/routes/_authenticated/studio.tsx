import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { DashboardScreen } from "@/screens/dashboard";
import { AiStudioScreen } from "@/screens/ai-studio";
import { CaptionAiScreen } from "@/screens/caption-ai";
import { PosterScreen } from "@/screens/poster";
import { AssetsScreen } from "@/screens/assets";

export const Route = createFileRoute("/_authenticated/studio")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Studio — Zentry Qor" },
      {
        name: "description",
        content:
          "Your whole workspace in one page — dashboard, AI Studio, CaptionAI, Poster, and the asset vault load together and switch instantly.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) =>
    z
      .object({
        screen: z
          .enum(["dashboard", "ai", "caption-ai", "poster", "assets"])
          .optional()
          .default("dashboard"),
        tool: z.string().optional(),
        prompt: z.string().optional(),
      })
      .parse(s),
  component: StudioPage,
});

const SCREENS = [
  { id: "dashboard", render: () => <DashboardScreen /> },
  { id: "ai", render: () => <AiStudioScreen /> },
  { id: "caption-ai", render: () => <CaptionAiScreen /> },
  { id: "poster", render: () => <PosterScreen /> },
  { id: "assets", render: () => <AssetsScreen /> },
] as const;

function StudioPage() {
  const { screen } = Route.useSearch();

  return (
    <div className="relative">
      {SCREENS.map((s) => {
        const active = s.id === screen;
        return (
          <div
            key={s.id}
            aria-hidden={!active}
            style={active ? undefined : { display: "none" }}
          >
            {s.render()}
          </div>
        );
      })}
    </div>
  );
}
