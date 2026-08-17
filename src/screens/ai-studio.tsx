import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  BookOpen,
  Calendar,
  FileText,
  FolderHeart,
  Grid3X3,
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
import { FirstVisitTutorial } from "@/components/FirstVisitTutorial";
import { generateAiText, generateAiImage, getAiCredits } from "@/lib/ai.functions";
import { shareToGallery } from "@/lib/gallery.functions";
import { saveGeneration } from "@/lib/library.functions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ZentryChat } from "@/components/ai/ZentryChat";



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

export function AiStudioScreen() {
  const { tool: toolParam, prompt: promptParam } = useSearch({ strict: false }) as { tool?: string; prompt?: string };
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<ToolId | null>(null);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [imageOutput, setImageOutput] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [lastPromptUsed, setLastPromptUsed] = useState<string>("");
  const [sharedIds, setSharedIds] = useState<Set<string>>(new Set());
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [lastSavedForTool, setLastSavedForTool] = useState<ToolId | null>(null);

  const runText = useServerFn(generateAiText);
  const runImage = useServerFn(generateAiImage);
  const fetchCredits = useServerFn(getAiCredits);
  const share = useServerFn(shareToGallery);
  const save = useServerFn(saveGeneration);
  const active = TOOLS.find((t) => t.id === activeId) ?? null;

  // Deep-link: open tool via ?tool=<id>
  useEffect(() => {
    if (toolParam && TOOLS.some((t) => t.id === toolParam)) {
      setActiveId(toolParam as ToolId);
    }
  }, [toolParam]);

  // Deep-link: pre-fill prompt from ?prompt= (template flow)
  useEffect(() => {
    if (promptParam) setInput(promptParam);
  }, [promptParam]);

  const creditsQuery = useQuery({
    queryKey: ["ai-credits"],
    queryFn: () => fetchCredits(),
    staleTime: 15_000,
  });

  const mut = useMutation({
    mutationFn: async ({ tool, value }: { tool: Tool; value: string }) => {
      const builtPrompt = tool.buildPrompt(value);
      setLastPromptUsed(builtPrompt);
      if (tool.id === "thumbnail") {
        const r = await runImage({ data: { prompt: builtPrompt, aspectRatio } });
        if (!r.image) throw new Error(r.error ?? "Image generation failed");
        return { kind: "image" as const, image: r.image, tool, builtPrompt, value };
      }
      const r = await runText({ data: { prompt: builtPrompt, system: tool.system } });
      return { kind: "text" as const, text: r.text, tool, builtPrompt, value };
    },
    onSuccess: async (r) => {
      if (r.kind === "image") {
        setImageOutput(r.image);
        setOutput("");
      } else {
        setOutput(r.text);
        setImageOutput(null);
      }
      creditsQuery.refetch();

      // Auto-save to library; link as a version when the same tool is re-run
      try {
        const parentId = lastSavedForTool === r.tool.id ? lastSavedId ?? undefined : undefined;
        const saved = await save({
          data: {
            toolId: r.tool.id,
            toolName: r.tool.name,
            kind: r.kind,
            prompt: r.builtPrompt,
            systemPrompt: r.tool.system || undefined,
            input: r.value,
            outputText: r.kind === "text" ? r.text : undefined,
            outputImage: r.kind === "image" ? r.image : undefined,
            aspectRatio: r.kind === "image" ? aspectRatio : undefined,
            creditsCost: r.kind === "image" ? 30 : 10,
            parentId,
          },
        });
        setLastSavedId(saved.id);
        setLastSavedForTool(r.tool.id);
      } catch {
        // silent — library save is best-effort
      }
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Generation failed");
      creditsQuery.refetch();
    },
  });

  const shareMut = useMutation({
    mutationFn: async (payload: { kind: "text" | "image"; prompt: string; outputText?: string; imageUrl?: string }) => {
      return share({ data: payload });
    },
    onSuccess: (r) => {
      setSharedIds((s) => new Set(s).add(r.id));
      toast.success("Shared to gallery");
    },
    onError: (e: any) => toast.error(e?.message ?? "Share failed"),
  });


  const openTool = (id: ToolId) => {
    setActiveId(id);
    setInput("");
    setOutput("");
    setImageOutput(null);
    setAspectRatio("16:9");
    setLastSavedId(null);
    setLastSavedForTool(null);
  };


  const isThumbnail = active?.id === "thumbnail";
  const credits = creditsQuery.data;
  const cost = isThumbnail ? (credits?.costs.image ?? 30) : (credits?.costs.text ?? 10);
  const insufficient = !!credits && credits.remaining < cost;


  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <FirstVisitTutorial
        storageKey="tutorial:ai:v1"
        title="AI Studio"
        steps={[
          { title: "Generate text & images", body: "Pick a prompt template or write your own. Text costs 10 credits, images cost 30 — the balance on the right updates instantly." },
          { title: "Save what you love", body: "Every generation can be saved to your Library or shared straight to the public Gallery." },
          { title: "Tone & style presets", body: "Use the preset chips to steer voice, length, and format. Great starting points for hooks, captions, and outlines." },
        ]}
      />
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

      <div className="relative pb-40 sm:pb-32">
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
        

        <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-10 sm:pb-14">
          {/* Header — left aligned, editorial */}
          <div className="max-w-3xl">
            <div className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground flex items-center gap-2">
              <Wand2 className="h-3 w-3 text-accent" /> The creator toolkit
            </div>
            <h1 className="mt-4 text-4xl sm:text-6xl font-semibold tracking-[-0.035em] leading-[1.02]">
              Nine tools. One{" "}
              <span className="text-gradient-brand italic leading-[1.1] pb-1 inline-block">
                unfair
              </span>{" "}
              advantage.
            </h1>
            <p className="mt-4 max-w-[52ch] text-sm sm:text-base text-muted-foreground leading-relaxed">
              Captions, hooks, scripts, thumbnails and trends, generated in seconds.
              Every run tells you the credit cost before you spend it.
            </p>
          </div>

          {/* Zentry chat — ask anything about editing, posting and going viral */}
          <div className="mt-10 sm:mt-14">
            <ZentryChat
              tools={TOOLS.filter((t) => t.id !== "thumbnail").map((t) => ({
                id: t.id,
                name: t.name,
                tagline: t.tagline,
                system: t.system,
              }))}
              onCreditsChange={() => creditsQuery.refetch()}
            />
          </div>

          {/* Thumbnail generator — the only visual tool that lives outside the chat */}
          <div className="mt-10 sm:mt-14 grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            <button
              onClick={() => openTool("thumbnail")}
              className="group relative lg:col-span-2 overflow-hidden text-left rounded-3xl border border-border/60 bg-gradient-to-br from-emerald-500/12 via-elevated/30 to-primary/10 hover:border-foreground/25 transition-all duration-300 p-6 sm:p-8 min-h-[240px] flex flex-col justify-between"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-500"
              />
              <div className="relative flex items-start justify-between gap-4">
                <span className="h-12 w-12 rounded-2xl bg-background/50 border border-border/60 flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-emerald-400" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="relative mt-8">
                <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-400/90">
                  Image tool
                </div>
                <div className="mt-3 text-2xl sm:text-4xl font-medium tracking-[-0.03em]">
                  Thumbnail Photo Generator
                </div>
                <p className="mt-2 max-w-[44ch] text-sm text-muted-foreground">
                  Click-worthy thumbnails in any ratio — 16:9, 9:16, 4:3 or 3:4.
                  Download it or share it straight to the gallery.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {(["16:9", "9:16", "4:3", "3:4"] as AspectRatio[]).map((r) => (
                    <span
                      key={r}
                      className="rounded-full border border-border/60 bg-background/40 px-3 py-1 text-[11px] text-muted-foreground"
                    >
                      {r}
                    </span>
                  ))}
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] text-emerald-300">
                    {credits?.costs.image ?? 30} credits
                  </span>
                </div>
              </div>
            </button>

            {/* Closing tile — keeps the grid full and routes to the surrounding surfaces */}
            <div className="rounded-3xl border border-border/60 bg-background/40 p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div>
                <div className="text-lg font-medium tracking-[-0.02em]">
                  Every other tool lives in the chat
                </div>
                <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-[40ch]">
                  Type <span className="text-primary font-medium">@</span> in Zentry Chat to pull in
                  captions, hooks, scripts, plans, trends and hashtags — or add your own skill.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/templates"
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-elevated/40 hover:bg-elevated/80 hover:border-foreground/30 px-4 py-2 text-xs font-medium transition-all"
                >
                  <BookOpen className="h-3.5 w-3.5 text-accent icon-fx" /> Templates
                </Link>
                <Link
                  to="/gallery"
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-elevated/40 hover:bg-elevated/80 hover:border-foreground/30 px-4 py-2 text-xs font-medium transition-all"
                >
                  <Grid3X3 className="h-3.5 w-3.5 text-primary icon-fx" /> Gallery
                </Link>
                <Link
                  to="/library"
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-elevated/40 hover:bg-elevated/80 hover:border-foreground/30 px-4 py-2 text-xs font-medium transition-all"
                >
                  <FolderHeart className="h-3.5 w-3.5 text-rose-400 icon-fx" /> My library
                </Link>
              </div>
            </div>
          </div>

        </main>

      </div>

      {/* Tool drawer/modal */}
      {active && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-background/70 backdrop-blur-md"
          onClick={() => { setActiveId(null); if (toolParam) navigate({ to: "/ai", search: {} }); }}
        >
          <div
            className="relative w-full sm:max-w-2xl max-h-[85vh] sm:max-h-[92vh] overflow-y-auto glass-strong border border-border/60 rounded-t-3xl sm:rounded-3xl p-6 pb-32 sm:p-8 sm:pb-8"
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
                onClick={() => { setActiveId(null); if (toolParam) navigate({ to: "/ai", search: {} }); }}
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
                className="pb-ai-button disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="text-xs uppercase tracking-[0.2em] text-accent mb-3 flex items-center justify-between gap-3">
                  <span>Output</span>
                  <button
                    onClick={() =>
                      shareMut.mutate({ kind: "text", prompt: lastPromptUsed || input, outputText: output })
                    }
                    disabled={shareMut.isPending}
                    className="text-muted-foreground hover:text-foreground normal-case tracking-normal text-xs disabled:opacity-60"
                  >
                    {shareMut.isPending ? "Sharing…" : "Share to gallery"}
                  </button>
                </div>
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{output}</ReactMarkdown>
                </div>
              </div>
            )}

            {imageOutput && (
              <div className="mt-6 p-5 rounded-2xl bg-elevated/40 border border-border/60">
                <div className="text-xs uppercase tracking-[0.2em] text-accent mb-3 flex items-center justify-between gap-3">
                  <span>Thumbnail</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        shareMut.mutate({ kind: "image", prompt: lastPromptUsed || input, imageUrl: imageOutput })
                      }
                      disabled={shareMut.isPending}
                      className="text-muted-foreground hover:text-foreground normal-case tracking-normal text-xs disabled:opacity-60"
                    >
                      {shareMut.isPending ? "Sharing…" : "Share to gallery"}
                    </button>
                    <a
                      href={imageOutput}
                      download="thumbnail.png"
                      className="text-muted-foreground hover:text-foreground normal-case tracking-normal text-xs"
                    >
                      Download
                    </a>
                  </div>
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
