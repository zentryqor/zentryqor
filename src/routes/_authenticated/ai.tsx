import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, ImageIcon, Loader2, Sparkles, Wand2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { generateAiText, generateAiImage } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({
    meta: [
      { title: "AI Studio — Zentry Qor" },
      { name: "description", content: "Generate text and images with state-of-the-art AI models." },
    ],
  }),
  component: AiStudio,
});

type Tab = "text" | "image";

function AiStudio() {
  const [tab, setTab] = useState<Tab>("text");
  const [textPrompt, setTextPrompt] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [textOut, setTextOut] = useState("");
  const [imageOut, setImageOut] = useState<string | null>(null);

  const runText = useServerFn(generateAiText);
  const runImage = useServerFn(generateAiImage);

  const textMut = useMutation({
    mutationFn: (prompt: string) =>
      runText({
        data: {
          prompt,
          system:
            "You are a sharp creative copilot for content creators. Be concise, structured, and inspiring. Use markdown.",
        },
      }),
    onSuccess: (r) => setTextOut(r.text),
    onError: (e: any) => toast.error(e?.message ?? "Generation failed"),
  });

  const imageMut = useMutation({
    mutationFn: (prompt: string) => runImage({ data: { prompt } }),
    onSuccess: (r) => setImageOut(r.image),
    onError: (e: any) => toast.error(e?.message ?? "Image generation failed"),
  });

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
        {/* Top bar */}
        <header className="sticky top-0 z-30 glass border-b border-border/60">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
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

        <main className="max-w-5xl mx-auto px-6 py-12">
          {/* Hero */}
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3 flex items-center justify-center gap-1.5">
              <Wand2 className="h-3 w-3 text-accent" /> Powered by OpenRouter
            </div>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em]">
              Create with <span className="text-gradient-brand">intelligence</span>.
            </h1>
            <p className="text-sm text-muted-foreground mt-3">
              Draft copy, brainstorm ideas, and conjure visuals — all from one prompt.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-6">
            <div className="glass rounded-full p-1 flex items-center gap-1">
              <TabBtn active={tab === "text"} onClick={() => setTab("text")}>
                <Wand2 className="h-3.5 w-3.5" /> Text
              </TabBtn>
              <TabBtn active={tab === "image"} onClick={() => setTab("image")}>
                <ImageIcon className="h-3.5 w-3.5" /> Image
              </TabBtn>
            </div>
          </div>

          {/* Panel */}
          <div className="glass rounded-3xl p-6 sm:p-8">
            {tab === "text" ? (
              <div className="space-y-4">
                <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Your prompt
                </label>
                <textarea
                  value={textPrompt}
                  onChange={(e) => setTextPrompt(e.target.value)}
                  placeholder="Write 5 viral TikTok hooks for a fitness creator..."
                  rows={4}
                  className="w-full bg-elevated/40 border border-border/60 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Model: gpt-oss-120b</span>
                  <button
                    onClick={() => textPrompt.trim() && textMut.mutate(textPrompt.trim())}
                    disabled={textMut.isPending || !textPrompt.trim()}
                    className="h-11 px-6 rounded-xl bg-foreground text-background text-sm font-medium magnetic glow-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {textMut.isPending ? (
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

                {textOut && (
                  <div className="mt-6 p-5 rounded-2xl bg-elevated/40 border border-border/60">
                    <div className="text-xs uppercase tracking-[0.2em] text-accent mb-3">Output</div>
                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown>{textOut}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Describe your image
                </label>
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="A cinematic neon-lit cyberpunk skyline at dusk, hyper detailed..."
                  rows={4}
                  className="w-full bg-elevated/40 border border-border/60 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Model: riverflow-v2.5-pro</span>
                  <button
                    onClick={() => imagePrompt.trim() && imageMut.mutate(imagePrompt.trim())}
                    disabled={imageMut.isPending || !imagePrompt.trim()}
                    className="h-11 px-6 rounded-xl bg-foreground text-background text-sm font-medium magnetic glow-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {imageMut.isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Rendering
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-3.5 w-3.5" /> Generate
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-6">
                  {imageMut.isPending ? (
                    <div className="aspect-square rounded-2xl bg-elevated/40 border border-border/60 flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" />
                        <div className="text-xs text-muted-foreground mt-3 uppercase tracking-[0.2em]">
                          Conjuring pixels
                        </div>
                      </div>
                    </div>
                  ) : imageOut ? (
                    <div className="relative group">
                      <img
                        src={imageOut}
                        alt="AI generated"
                        className="w-full rounded-2xl border border-border/60"
                      />
                      <a
                        href={imageOut}
                        download="zentry-ai.png"
                        className="absolute top-3 right-3 h-9 px-3 rounded-full glass-strong text-xs flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Download className="h-3 w-3" /> Download
                      </a>
                    </div>
                  ) : (
                    <div className="aspect-square rounded-2xl bg-elevated/20 border border-dashed border-border/60 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="h-8 w-8 mx-auto opacity-40" />
                        <div className="text-xs mt-2 uppercase tracking-[0.2em]">Your image appears here</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 h-9 rounded-full text-sm flex items-center gap-1.5 transition-all ${
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
