import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  ArrowUpRight,
  Calendar,
  FileText,
  
  Hash,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  Quote,
  Sparkles,
  TrendingUp,
  Video,
  Wand2,
  Zap,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { AppHeader, AppHeaderLink } from "@/components/AppHeader";
import { WorkspaceDock } from "@/components/WorkspaceDock";
import { generateAiText, generateAiImage, getAiCredits } from "@/lib/ai.functions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({
    meta: [
      { title: "AI Studio — Zentry Qor" },
      {
        name: "description",
        content:
          "Viral captions, hooks, scripts, hashtags & more — a creator AI toolkit powered by Zentry Qor.",
      },
    ],
  }),
  component: AiStudio,
});

type ToolId =
  | "caption"
  | "hook"
  | "video-idea"
  | "thumbnail"
  | "bio"
  | "planner"
  | "script"
  | "trend"
  | "hashtag";

type Tool = {
  id: ToolId;
  name: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string; // tailwind text color class for icon
  placeholder: string;
  inputLabel: string;
  system: string;
  buildPrompt: (input: string) => string;
};

const TOOLS: Tool[] = [
  {
    id: "caption",
    name: "Viral Caption Generator",
    tagline: "Scroll-stopping captions for any post.",
    icon: Quote,
    accent: "text-pink-400",
    placeholder: "Topic: launching my new skincare brand for Gen-Z",
    inputLabel: "What's the post about?",
    system:
      "You are a viral social media copywriter. Output 5 punchy, scroll-stopping captions (under 220 chars each) with varied tones: bold, witty, story-driven, controversial, and emotional. Add 1 strong CTA per caption. Use markdown numbered list.",
    buildPrompt: (i) => `Write viral captions about: ${i}`,
  },
  {
    id: "hook",
    name: "Hook Generator",
    tagline: "First 3 seconds that stop the scroll.",
    icon: Zap,
    accent: "text-yellow-400",
    placeholder: "Niche: personal finance for 20-somethings",
    inputLabel: "Topic / Niche",
    system:
      "You are a short-form video hook expert (TikTok/Reels/Shorts). Output 10 hooks under 12 words each. Mix curiosity, contrarian, listicle, question, story, and shock formats. Mark the format type in parentheses after each. Use markdown numbered list.",
    buildPrompt: (i) => `Write hooks for: ${i}`,
  },
  {
    id: "video-idea",
    name: "Video Idea Generator",
    tagline: "10 fresh concepts on demand.",
    icon: Video,
    accent: "text-blue-400",
    placeholder: "Niche: home workout for busy moms",
    inputLabel: "Your niche / audience",
    system:
      "You are a viral content strategist. Generate 10 short-form video ideas. For each: **Title** — one line concept — *format* (talking head / tutorial / POV / day in life / reaction). Make them specific, native to short-form, and emotionally hooky.",
    buildPrompt: (i) => `Video ideas for: ${i}`,
  },
  {
    id: "thumbnail",
    name: "Thumbnail Photo Generator",
    tagline: "AI-generated thumbnail images.",
    icon: ImageIcon,
    accent: "text-emerald-400",
    placeholder: "Bold YouTube thumbnail: shocked man holding a giant burger, neon background, 'I ATE THIS' text",
    inputLabel: "Describe the thumbnail",
    system: "",
    buildPrompt: (i) =>
      `A high-contrast, click-worthy YouTube thumbnail, 16:9, vivid colors, dramatic lighting, bold composition. Subject: ${i}`,
  },
  {
    id: "bio",
    name: "Brand Bio Generator",
    tagline: "A bio that converts followers.",
    icon: Megaphone,
    accent: "text-orange-400",
    placeholder: "I help SaaS founders grow on LinkedIn through storytelling",
    inputLabel: "What you do (one sentence)",
    system:
      "You are a personal branding expert. Write 4 distinct bio variations (Instagram/TikTok-style, ≤150 chars): 1) bold & confident, 2) playful & witty, 3) authority-driven, 4) minimal aesthetic. Include emojis tastefully where it fits.",
    buildPrompt: (i) => `Write brand bios for: ${i}`,
  },
  {
    id: "planner",
    name: "Content Planner",
    tagline: "7-day calendar in seconds.",
    icon: Calendar,
    accent: "text-violet-400",
    placeholder: "Gaming creator on Instagram & TikTok",
    inputLabel: "Niche, platform & goal",
    system:
      "You are a content strategist. Build a 7-day content calendar as a markdown table with columns: Day | Platform | Format | Hook | Topic | CTA. Mix educational, entertaining, and promotional content (60/30/10 rule).",
    buildPrompt: (i) => `Build a 7-day content plan for: ${i}`,
  },
  {
    id: "script",
    name: "Script Assistant",
    tagline: "Full short-form scripts, ready to film.",
    icon: FileText,
    accent: "text-cyan-400",
    placeholder: "30-sec Reel about morning routines that 10x productivity",
    inputLabel: "Video idea & length",
    system:
      "You are a short-form video scriptwriter. Output a full script with sections: **Hook (0-3s)**, **Setup (3-8s)**, **Value (main beats with timestamps)**, **CTA (last 3s)**. Add B-roll/visual cues in *italics*. Keep total under requested duration.",
    buildPrompt: (i) => `Write a script for: ${i}`,
  },
  {
    id: "trend",
    name: "Trend Finder",
    tagline: "What's hot in your niche right now.",
    icon: TrendingUp,
    accent: "text-rose-400",
    placeholder: "Niche: AI productivity tools",
    inputLabel: "Niche / industry",
    system:
      "You are a trend analyst. List 8 current trends, sounds, formats, or angles working in this niche on TikTok/Reels/Shorts. For each: **Trend name** — why it works — how to apply it to the user's niche. Be specific and modern (2025).",
    buildPrompt: (i) => `Find trends for: ${i}`,
  },
  {
    id: "hashtag",
    name: "Hashtag Assistant",
    tagline: "Reach-maximizing hashtag mixes.",
    icon: Hash,
    accent: "text-teal-400",
    placeholder: "Post about: vegan meal prep recipes",
    inputLabel: "Post topic",
    system:
      "You are a hashtag strategist. Output 3 groups for Instagram/TikTok: **High volume (1M+)**, **Medium (100K-1M)**, **Niche (<100K)**. 8 hashtags per group. Then a copy-paste block combining the best 20. No fluff.",
    buildPrompt: (i) => `Generate hashtags for: ${i}`,
  },
];

type AspectRatio = "16:9" | "9:16" | "4:3" | "3:4";

function AiStudio() {
  const [activeId, setActiveId] = useState<ToolId | null>(null);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [imageOutput, setImageOutput] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");

  const runText = useServerFn(generateAiText);
  const runImage = useServerFn(generateAiImage);
  const fetchCredits = useServerFn(getAiCredits);
  const active = TOOLS.find((t) => t.id === activeId) ?? null;

  const creditsQuery = useQuery({
    queryKey: ["ai-credits"],
    queryFn: () => fetchCredits(),
    staleTime: 15_000,
  });

  const mut = useMutation({
    mutationFn: async ({ tool, value }: { tool: Tool; value: string }) => {
      if (tool.id === "thumbnail") {
        const r = await runImage({ data: { prompt: tool.buildPrompt(value), aspectRatio } });
        return { kind: "image" as const, image: r.image };
      }
      const r = await runText({ data: { prompt: tool.buildPrompt(value), system: tool.system } });
      return { kind: "text" as const, text: r.text };
    },
    onSuccess: (r) => {
      if (r.kind === "image") {
        setImageOutput(r.image);
        setOutput("");
      } else {
        setOutput(r.text);
        setImageOutput(null);
      }
      creditsQuery.refetch();
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Generation failed");
      creditsQuery.refetch();
    },
  });

  const openTool = (id: ToolId) => {
    setActiveId(id);
    setInput("");
    setOutput("");
    setImageOutput(null);
    setAspectRatio("16:9");
  };

  const isThumbnail = active?.id === "thumbnail";
  const credits = creditsQuery.data;
  const cost = isThumbnail ? (credits?.costs.image ?? 30) : (credits?.costs.text ?? 10);
  const insufficient = !!credits && credits.remaining < cost;


  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <AnimatedOrbs />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04] text-foreground"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
        aria-hidden
      />

      <div className="relative pb-28">
        <AppHeader
          nav={
            <>
              <AppHeaderLink to="/dashboard">Dashboard</AppHeaderLink>
              <AppHeaderLink to="/assets">Vault</AppHeaderLink>
              <AppHeaderLink to="/ai" active>AI Studio</AppHeaderLink>
            </>
          }
          right={
            credits ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="group relative flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full bg-gradient-to-br from-primary/15 via-elevated/60 to-accent/15 border border-border/60 hover:border-accent/60 hover:shadow-[0_0_24px_-6px_hsl(var(--accent)/0.45)] transition-all"
                  >
                    <span className="h-5 w-5 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_12px_-2px_hsl(var(--accent)/0.6)]">
                      <Zap className="h-2.5 w-2.5 text-background icon-fx" />
                    </span>
                    <span className="text-foreground font-semibold tabular-nums text-xs">{credits.remaining}</span>
                    <span className="text-muted-foreground text-[11px] tabular-nums">/ {credits.limit}</span>
                    {credits.isPremium && (
                      <span className="ml-1 text-[9px] uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent font-medium">
                        Pro
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={8}
                  className="w-[320px] p-5 rounded-2xl glass-strong border border-border/60"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-base font-semibold tracking-tight">Credits</div>
                    <div className="text-sm text-muted-foreground">
                      {credits.remaining} left
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-elevated/60 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(0, (credits.remaining / credits.limit) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                    Daily credits reset at midnight UTC
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-3">
                    <span>Text tools</span>
                    <span className="text-foreground font-medium">{credits.costs.text} credits</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Thumbnail image</span>
                    <span className="text-foreground font-medium">{credits.costs.image} credits</span>
                  </div>

                  {!credits.isPremium && (
                    <Link
                      to="/billing"
                      className="mt-5 w-full h-11 px-4 rounded-xl bg-foreground text-background text-sm font-medium magnetic glow-primary flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5 icon-fx" />
                      Upgrade — get 1,000 credits/day
                    </Link>
                  )}
                  {credits.isPremium && (
                    <div className="mt-5 text-center text-xs text-accent uppercase tracking-[0.2em]">
                      Premium — 1,000 / day
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            ) : null
          }
        />
        <WorkspaceDock />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-10 sm:pb-14">
          {/* Hero */}
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3 flex items-center justify-center gap-1.5">
              <Wand2 className="h-3 w-3 text-accent" /> The Creator Toolkit
            </div>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em]">
              Your unfair{" "}
              <span className="text-gradient-brand">creative advantage</span>.
            </h1>
            <p className="text-sm text-muted-foreground mt-3">
              Nine AI tools tuned for creators — captions, hooks, scripts, trends, and more.
            </p>
          </div>

          {/* Tool grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOOLS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => openTool(t.id)}
                  className="group text-left glass rounded-2xl p-5 hover:border-foreground/30 border border-border/60 transition-all hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-elevated/50 border border-border/60 flex items-center justify-center">
                      <Icon className={`h-5 w-5 ${t.accent}`} />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors icon-fx" />
                  </div>
                  <div className="text-base font-medium tracking-tight">{t.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t.tagline}</div>
                </button>
              );
            })}
          </div>
        </main>
      </div>

      {/* Tool drawer/modal */}
      {active && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-background/70 backdrop-blur-md"
          onClick={() => setActiveId(null)}
        >
          <div
            className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto glass-strong border border-border/60 rounded-t-3xl sm:rounded-3xl p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-elevated/50 border border-border/60 flex items-center justify-center">
                  <active.icon className={`h-5 w-5 ${active.accent}`} />
                </div>
                <div>
                  <div className="text-base font-medium">{active.name}</div>
                  <div className="text-xs text-muted-foreground">{active.tagline}</div>
                </div>
              </div>
              <button
                onClick={() => setActiveId(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>

            <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {active.inputLabel}
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={active.placeholder}
              rows={3}
              className="mt-2 w-full bg-elevated/40 border border-border/60 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />

            {isThumbnail && (
              <div className="mt-5">
                <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Aspect ratio
                </label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {(["16:9", "9:16", "4:3", "3:4"] as AspectRatio[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setAspectRatio(r)}
                      className={`h-10 rounded-xl border text-xs font-medium transition-colors ${
                        aspectRatio === r
                          ? "bg-foreground text-background border-foreground"
                          : "bg-elevated/40 border-border/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {insufficient && credits && (
              <div className="mt-5 p-4 rounded-2xl border border-accent/30 bg-gradient-to-br from-primary/10 to-accent/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-accent icon-fx" />
                    Insufficient credits
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    This tool costs <span className="text-foreground font-medium">{cost}</span>{" "}
                    credits, but you only have <span className="text-foreground font-medium">{credits.remaining}</span>{" "}
                    left today.
                    {credits.isPremium
                      ? " Your daily allowance resets at midnight UTC."
                      : " Upgrade for 1,000 credits/day."}
                  </div>
                </div>
                {!credits.isPremium && (
                  <Link
                    to="/billing"
                    className="shrink-0 h-10 px-5 rounded-xl bg-foreground text-background text-xs font-medium flex items-center gap-1.5 magnetic glow-primary"
                  >
                    <Sparkles className="h-3.5 w-3.5 icon-fx" /> Upgrade to Premium
                  </Link>
                )}
              </div>
            )}


            <div className="flex items-center justify-between mt-4 gap-3">
              <div className="text-xs text-muted-foreground">
                {credits ? (
                  <span>
                    <span className="text-foreground font-medium">{cost} credits</span>
                    {" · "}
                    {credits.remaining} / {credits.limit} left today
                    {credits.isPremium ? " (Premium)" : ""}
                  </span>
                ) : (
                  <span className="opacity-50">…</span>
                )}
              </div>

              <button
                onClick={() =>
                  input.trim() && mut.mutate({ tool: active, value: input.trim() })
                }
                disabled={mut.isPending || !input.trim() || insufficient}
                className="h-11 px-6 rounded-xl bg-foreground text-background text-sm font-medium magnetic glow-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {mut.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating
                  </>
                ) : insufficient ? (
                  <>Not enough credits</>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 icon-fx" /> Generate · {cost}
                  </>
                )}

              </button>
            </div>


            {output && (
              <div className="mt-6 p-5 rounded-2xl bg-elevated/40 border border-border/60">
                <div className="text-xs uppercase tracking-[0.2em] text-accent mb-3">
                  Output
                </div>
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{output}</ReactMarkdown>
                </div>
              </div>
            )}

            {imageOutput && (
              <div className="mt-6 p-5 rounded-2xl bg-elevated/40 border border-border/60">
                <div className="text-xs uppercase tracking-[0.2em] text-accent mb-3 flex items-center justify-between">
                  <span>Thumbnail</span>
                  <a
                    href={imageOutput}
                    download="thumbnail.png"
                    className="text-muted-foreground hover:text-foreground normal-case tracking-normal"
                  >
                    Download
                  </a>
                </div>
                <img
                  src={imageOutput}
                  alt="Generated thumbnail"
                  className="w-full rounded-xl border border-border/60"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
