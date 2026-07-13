import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
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
  X,
  Zap,
  ArrowLeft,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { WorkspaceShell, SectionLabel } from "@/components/WorkspaceShell";
import { generateAiText, generateAiImage, getAiCredits } from "@/lib/ai.functions";
import { shareToGallery } from "@/lib/gallery.functions";
import { saveGeneration } from "@/lib/library.functions";

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({
    meta: [
      { title: "AI Studio — Zentry Qor" },
      {
        name: "description",
        content:
          "Nine AI tools for creators — captions, hooks, scripts, thumbnails, trends, and more.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) =>
    z.object({ tool: z.string().optional(), prompt: z.string().optional() }).parse(s),
  component: AiStudio,
});

type ToolId =
  | "caption" | "hook" | "video-idea" | "thumbnail" | "bio"
  | "planner" | "script" | "trend" | "hashtag";

type Tool = {
  id: ToolId;
  name: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  placeholder: string;
  inputLabel: string;
  system: string;
  buildPrompt: (input: string) => string;
};

const TOOLS: Tool[] = [
  { id: "caption", name: "caption-studio", tagline: "scroll-stopping captions",
    icon: Quote, placeholder: "Topic: launching my new skincare brand for Gen-Z",
    inputLabel: "what's the post about?",
    system: "You are a viral social media copywriter. Output 5 punchy, scroll-stopping captions (under 220 chars each) with varied tones: bold, witty, story-driven, controversial, and emotional. Add 1 strong CTA per caption. Use markdown numbered list.",
    buildPrompt: (i) => `Write viral captions about: ${i}` },
  { id: "hook", name: "hook-generator", tagline: "first 3 seconds",
    icon: Zap, placeholder: "Niche: personal finance for 20-somethings",
    inputLabel: "topic / niche",
    system: "You are a short-form video hook expert. Output 10 hooks under 12 words each. Mix curiosity, contrarian, listicle, question, story, and shock formats. Mark the format type in parentheses after each. Use markdown numbered list.",
    buildPrompt: (i) => `Write hooks for: ${i}` },
  { id: "video-idea", name: "video-ideas", tagline: "10 fresh concepts",
    icon: Video, placeholder: "Niche: home workout for busy moms",
    inputLabel: "your niche / audience",
    system: "You are a viral content strategist. Generate 10 short-form video ideas. For each: **Title** — one line concept — *format* (talking head / tutorial / POV / day in life / reaction). Make them specific, native to short-form, and emotionally hooky.",
    buildPrompt: (i) => `Video ideas for: ${i}` },
  { id: "thumbnail", name: "thumbnail-image", tagline: "ai-generated thumbnails",
    icon: ImageIcon, placeholder: "Bold YouTube thumbnail: shocked man holding a giant burger, neon background",
    inputLabel: "describe the thumbnail", system: "",
    buildPrompt: (i) => `A high-contrast, click-worthy YouTube thumbnail, 16:9, vivid colors, dramatic lighting, bold composition. Subject: ${i}` },
  { id: "bio", name: "brand-bio", tagline: "bio that converts",
    icon: Megaphone, placeholder: "I help SaaS founders grow on LinkedIn through storytelling",
    inputLabel: "what you do (one sentence)",
    system: "You are a personal branding expert. Write 4 distinct bio variations (Instagram/TikTok-style, ≤150 chars): 1) bold & confident, 2) playful & witty, 3) authority-driven, 4) minimal aesthetic. Include emojis tastefully where it fits.",
    buildPrompt: (i) => `Write brand bios for: ${i}` },
  { id: "planner", name: "content-planner", tagline: "7-day calendar",
    icon: Calendar, placeholder: "Gaming creator on Instagram & TikTok",
    inputLabel: "niche, platform & goal",
    system: "You are a content strategist. Build a 7-day content calendar as a markdown table with columns: Day | Platform | Format | Hook | Topic | CTA. Mix educational, entertaining, and promotional content (60/30/10 rule).",
    buildPrompt: (i) => `Build a 7-day content plan for: ${i}` },
  { id: "script", name: "script-assistant", tagline: "full short-form scripts",
    icon: FileText, placeholder: "30-sec Reel about morning routines",
    inputLabel: "video idea & length",
    system: "You are a short-form video scriptwriter. Output a full script with sections: **Hook (0-3s)**, **Setup (3-8s)**, **Value (main beats with timestamps)**, **CTA (last 3s)**. Add B-roll/visual cues in *italics*.",
    buildPrompt: (i) => `Write a script for: ${i}` },
  { id: "trend", name: "trend-finder", tagline: "what's hot now",
    icon: TrendingUp, placeholder: "Niche: AI productivity tools",
    inputLabel: "niche / industry",
    system: "You are a trend analyst. List 8 current trends, sounds, formats, or angles working in this niche on TikTok/Reels/Shorts. For each: **Trend name** — why it works — how to apply it to the user's niche. Be specific and modern (2025).",
    buildPrompt: (i) => `Find trends for: ${i}` },
  { id: "hashtag", name: "hashtag-assistant", tagline: "reach-maximizing mixes",
    icon: Hash, placeholder: "Post about: vegan meal prep recipes",
    inputLabel: "post topic",
    system: "You are a hashtag strategist. Output 3 groups for Instagram/TikTok: **High volume (1M+)**, **Medium (100K-1M)**, **Niche (<100K)**. 8 hashtags per group. Then a copy-paste block combining the best 20. No fluff.",
    buildPrompt: (i) => `Generate hashtags for: ${i}` },
];

type AspectRatio = "16:9" | "9:16" | "4:3" | "3:4";

function AiStudio() {
  const { tool: toolParam, prompt: promptParam } = Route.useSearch() as { tool?: string; prompt?: string };
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<ToolId | null>(null);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [imageOutput, setImageOutput] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [lastPromptUsed, setLastPromptUsed] = useState<string>("");
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [lastSavedForTool, setLastSavedForTool] = useState<ToolId | null>(null);

  const runText = useServerFn(generateAiText);
  const runImage = useServerFn(generateAiImage);
  const fetchCredits = useServerFn(getAiCredits);
  const share = useServerFn(shareToGallery);
  const save = useServerFn(saveGeneration);
  const active = TOOLS.find((t) => t.id === activeId) ?? null;

  useEffect(() => {
    if (toolParam && TOOLS.some((t) => t.id === toolParam)) setActiveId(toolParam as ToolId);
  }, [toolParam]);

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
      if (r.kind === "image") { setImageOutput(r.image); setOutput(""); }
      else { setOutput(r.text); setImageOutput(null); }
      creditsQuery.refetch();
      try {
        const parentId = lastSavedForTool === r.tool.id ? lastSavedId ?? undefined : undefined;
        const saved = await save({
          data: {
            toolId: r.tool.id, toolName: r.tool.name, kind: r.kind,
            prompt: r.builtPrompt, systemPrompt: r.tool.system || undefined, input: r.value,
            outputText: r.kind === "text" ? r.text : undefined,
            outputImage: r.kind === "image" ? r.image : undefined,
            aspectRatio: r.kind === "image" ? aspectRatio : undefined,
            creditsCost: r.kind === "image" ? 30 : 10, parentId,
          },
        });
        setLastSavedId(saved.id);
        setLastSavedForTool(r.tool.id);
      } catch {}
    },
    onError: (e: any) => { toast.error(e?.message ?? "Generation failed"); creditsQuery.refetch(); },
  });

  const shareMut = useMutation({
    mutationFn: async (p: { kind: "text" | "image"; prompt: string; outputText?: string; imageUrl?: string }) => share({ data: p }),
    onSuccess: () => toast.success("Shared to gallery"),
    onError: (e: any) => toast.error(e?.message ?? "Share failed"),
  });

  const openTool = (id: ToolId) => {
    setActiveId(id); setInput(""); setOutput(""); setImageOutput(null);
    setAspectRatio("16:9"); setLastSavedId(null); setLastSavedForTool(null);
  };

  const closeTool = () => {
    setActiveId(null);
    if (toolParam) navigate({ to: "/ai", search: {} });
  };

  const isThumbnail = active?.id === "thumbnail";
  const credits = creditsQuery.data;
  const cost = isThumbnail ? (credits?.costs.image ?? 30) : (credits?.costs.text ?? 10);
  const insufficient = !!credits && credits.remaining < cost;

  return (
    <WorkspaceShell
      path={active ? ["ai-studio", active.name] : ["ai-studio"]}
      isPremium={credits?.isPremium}
      actions={
        credits && (
          <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-md terminal-panel text-[11px] font-mono-display">
            <Zap className="h-3 w-3 text-accent" strokeWidth={2} />
            <span className="tabular-nums">{credits.remaining}</span>
            <span className="text-muted-foreground">/{credits.limit}</span>
            {credits.isPremium && <span className="ml-1 text-accent uppercase text-[9px] tracking-wider">pro</span>}
          </div>
        )
      }
    >
      {!active ? (
        <>
          <div className="mb-8">
            <div className="text-[11px] font-mono-display text-muted-foreground">
              &gt; ls ./tools
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-mono-display tracking-tight">
              9 tools <span className="text-muted-foreground">/ pick one</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2 font-mono-display">
              text tools cost <span className="text-accent">{credits?.costs.text ?? 10}</span> credits · thumbnail costs <span className="text-accent">{credits?.costs.image ?? 30}</span>
            </p>
          </div>

          <SectionLabel>tools</SectionLabel>
          <div className="terminal-panel rounded-md divide-y divide-border/50">
            {TOOLS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => openTool(t.id)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-elevated/30 transition-colors group"
                >
                  <div className="h-8 w-8 rounded-sm terminal-panel-inset flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-accent" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-mono-display truncate">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{t.tagline}</div>
                  </div>
                  <div className="text-[10px] font-mono-display uppercase tracking-wider text-muted-foreground shrink-0 hidden sm:block">
                    {t.id === "thumbnail" ? `${credits?.costs.image ?? 30}c` : `${credits?.costs.text ?? 10}c`}
                  </div>
                  <div className="text-muted-foreground group-hover:text-accent transition-colors font-mono-display shrink-0">→</div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            <Link to="/templates" className="h-8 px-3 rounded-md terminal-panel text-[11px] font-mono-display hover:bg-elevated/40 transition-colors">
              ./templates
            </Link>
            <Link to="/gallery" className="h-8 px-3 rounded-md terminal-panel text-[11px] font-mono-display hover:bg-elevated/40 transition-colors">
              ./gallery
            </Link>
            <Link to="/library" className="h-8 px-3 rounded-md terminal-panel text-[11px] font-mono-display hover:bg-elevated/40 transition-colors">
              ./my-library
            </Link>
          </div>
        </>
      ) : (
        <div className="max-w-3xl">
          <button
            onClick={closeTool}
            className="mb-6 inline-flex items-center gap-1.5 text-[11px] font-mono-display text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" strokeWidth={2} /> back to tools
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="h-9 w-9 rounded-sm terminal-panel-inset flex items-center justify-center">
              <active.icon className="h-4 w-4 text-accent" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="text-base font-mono-display">{active.name}</div>
              <div className="text-xs text-muted-foreground">{active.tagline}</div>
            </div>
          </div>

          <div className="terminal-panel rounded-md p-4 sm:p-5">
            <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono-display">
              {active.inputLabel}
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={active.placeholder}
              rows={3}
              className="mt-2 w-full bg-transparent border border-border/60 rounded-sm px-3 py-2 text-sm font-mono-display focus:outline-none focus:border-accent/60 resize-none"
            />

            {isThumbnail && (
              <div className="mt-4">
                <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono-display">
                  aspect
                </label>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {(["16:9", "9:16", "4:3", "3:4"] as AspectRatio[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setAspectRatio(r)}
                      className={`h-8 rounded-sm text-[11px] font-mono-display transition-colors ${
                        aspectRatio === r
                          ? "bg-accent text-accent-foreground"
                          : "terminal-panel-inset text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {insufficient && credits && (
              <div className="mt-4 p-3 rounded-sm border border-accent/30 text-xs font-mono-display flex items-center justify-between gap-3 flex-wrap">
                <span className="text-muted-foreground">
                  [!] need <span className="text-accent">{cost}</span> credits, have <span className="text-foreground">{credits.remaining}</span>
                </span>
                {!credits.isPremium && (
                  <Link to="/billing" className="h-7 px-2.5 rounded-sm bg-accent text-accent-foreground font-medium flex items-center gap-1">
                    upgrade
                  </Link>
                )}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-[11px] text-muted-foreground font-mono-display">
                cost: <span className="text-foreground">{cost}c</span>
                {credits && (
                  <>
                    {" · "}
                    <span className="tabular-nums">{credits.remaining}</span>/{credits.limit} left
                  </>
                )}
              </div>
              <button
                onClick={() => input.trim() && mut.mutate({ tool: active, value: input.trim() })}
                disabled={mut.isPending || !input.trim() || insufficient}
                className="h-9 px-4 rounded-sm bg-accent text-accent-foreground text-xs font-mono-display font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {mut.isPending ? (
                  <><Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} /> running…</>
                ) : insufficient ? "insufficient credits" : (
                  <><Sparkles className="h-3 w-3" strokeWidth={2} /> generate · {cost}c</>
                )}
              </button>
            </div>
          </div>

          {output && (
            <div className="mt-4 terminal-panel rounded-md p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-[0.2em] text-accent font-mono-display">stdout</span>
                <button
                  onClick={() => shareMut.mutate({ kind: "text", prompt: lastPromptUsed || input, outputText: output })}
                  disabled={shareMut.isPending}
                  className="text-[11px] text-muted-foreground hover:text-foreground font-mono-display"
                >
                  {shareMut.isPending ? "sharing…" : "share →"}
                </button>
              </div>
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{output}</ReactMarkdown>
              </div>
            </div>
          )}

          {imageOutput && (
            <div className="mt-4 terminal-panel rounded-md p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-[0.2em] text-accent font-mono-display">image.png</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => shareMut.mutate({ kind: "image", prompt: lastPromptUsed || input, imageUrl: imageOutput })}
                    disabled={shareMut.isPending}
                    className="text-[11px] text-muted-foreground hover:text-foreground font-mono-display"
                  >
                    {shareMut.isPending ? "sharing…" : "share"}
                  </button>
                  <a
                    href={imageOutput}
                    download="thumbnail.png"
                    className="text-[11px] text-muted-foreground hover:text-foreground font-mono-display"
                  >
                    download
                  </a>
                </div>
              </div>
              <img src={imageOutput} alt="Generated thumbnail" className="w-full rounded-sm border border-border/60" />
            </div>
          )}
        </div>
      )}
    </WorkspaceShell>
  );
}
