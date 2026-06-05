import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  FileText,
  Flame,
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
import { generateAiText } from "@/lib/ai.functions";

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
    name: "Thumbnail Idea Generator",
    tagline: "Click-worthy YouTube visuals.",
    icon: ImageIcon,
    accent: "text-emerald-400",
    placeholder: "Video: I tried the carnivore diet for 30 days",
    inputLabel: "Video title or topic",
    system:
      "You are a top YouTube thumbnail designer. Generate 5 thumbnail concepts. For each: **Concept name**, then describe (a) background, (b) subject pose/expression, (c) bold 3-5 word text overlay, (d) color palette, (e) emotional trigger. Make them high-contrast and curiosity-driven.",
    buildPrompt: (i) => `Thumbnail ideas for: ${i}`,
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
    placeholder: "Fitness creator on Instagram & TikTok",
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

function AiStudio() {
  const [activeId, setActiveId] = useState<ToolId | null>(null);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const runText = useServerFn(generateAiText);
  const active = TOOLS.find((t) => t.id === activeId) ?? null;

  const mut = useMutation({
    mutationFn: async ({ tool, value }: { tool: Tool; value: string }) =>
      runText({ data: { prompt: tool.buildPrompt(value), system: tool.system } }),
    onSuccess: (r) => setOutput(r.text),
    onError: (e: any) => toast.error(e?.message ?? "Generation failed"),
  });

  const openTool = (id: ToolId) => {
    setActiveId(id);
    setInput("");
    setOutput("");
  };

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

      <div className="relative">
        <header className="sticky top-0 z-30 glass border-b border-border/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="h-9 w-9 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
              <Link to="/" className="font-semibold tracking-tight text-gradient">
                Zentry Qor
              </Link>
            </div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-accent" /> AI Studio
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
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
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
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

            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Flame className="h-3 w-3 text-accent" /> Powered by gpt-oss-120b
              </span>
              <button
                onClick={() =>
                  input.trim() && mut.mutate({ tool: active, value: input.trim() })
                }
                disabled={mut.isPending || !input.trim()}
                className="h-11 px-6 rounded-xl bg-foreground text-background text-sm font-medium magnetic glow-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {mut.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" /> Generate
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
          </div>
        </div>
      )}
    </div>
  );
}
