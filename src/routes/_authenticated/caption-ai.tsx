import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Download,
  Loader2,
  Sparkles,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import {
  startTranscription,
  pollTranscription,
  type CaptionWord,
} from "@/lib/caption-ai.functions";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/_authenticated/caption-ai")({
  head: () => ({
    meta: [
      { title: "CaptionAI — Zentry Qor" },
      {
        name: "description",
        content:
          "Upload a short clip and instantly generate word-synced captions in TikTok Bold, Clean Minimal, or Dynamic Pop styles. Export a captioned video in one click.",
      },
    ],
  }),
  component: CaptionAiPage,
});

// -------- Caption styles --------

type StyleId = "tiktok-bold" | "clean-minimal" | "dynamic-pop";

type CaptionStyle = {
  id: StyleId;
  name: string;
  tagline: string;
  // For canvas export.
  canvas: {
    font: string;
    fontSizePct: number; // % of video height
    color: string;
    strokeColor?: string;
    strokeWidth?: number;
    shadow?: string;
    align: "center" | "bottom";
    background?: string; // fill for a rounded box behind text
    boxPaddingPct?: number;
    uppercase?: boolean;
    highlightColor?: string; // for word-by-word
    highlight?: "word" | "none";
    bouncePct?: number;
  };
};

const STYLES: CaptionStyle[] = [
  {
    id: "tiktok-bold",
    name: "TikTok Bold",
    tagline: "Big, centered, yellow. High-impact.",
    canvas: {
      font: "900 1em system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      fontSizePct: 0.075,
      color: "#FFEB3B",
      strokeColor: "#000000",
      strokeWidth: 6,
      align: "center",
      uppercase: true,
      highlight: "none",
    },
  },
  {
    id: "clean-minimal",
    name: "Clean Minimal",
    tagline: "Subtle. Bottom-anchored pill.",
    canvas: {
      font: "500 1em system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      fontSizePct: 0.042,
      color: "#FFFFFF",
      align: "bottom",
      background: "rgba(0,0,0,0.55)",
      boxPaddingPct: 0.02,
      highlight: "none",
    },
  },
  {
    id: "dynamic-pop",
    name: "Dynamic Pop",
    tagline: "Word-by-word highlight with a bounce.",
    canvas: {
      font: "800 1em system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      fontSizePct: 0.06,
      color: "#FFFFFF",
      strokeColor: "#000000",
      strokeWidth: 4,
      align: "center",
      highlight: "word",
      highlightColor: "#22D3EE",
      bouncePct: 0.12,
      uppercase: true,
    },
  },
];

// -------- Helpers --------

function findActiveIndex(words: CaptionWord[], currentMs: number) {
  // Binary search would be nicer, but linear is fine for a 1-min video.
  for (let i = 0; i < words.length; i++) {
    if (currentMs >= words[i].start && currentMs <= words[i].end) return i;
  }
  return -1;
}

function currentPhrase(words: CaptionWord[], currentMs: number, windowMs = 2600) {
  // Show a short rolling window of ~2.6s worth of words around currentMs.
  const active = findActiveIndex(words, currentMs);
  if (active === -1) {
    // Between words — show the upcoming/previous phrase within 400ms.
    const near = words.find(
      (w) => Math.abs(w.start - currentMs) < 400 || Math.abs(w.end - currentMs) < 400,
    );
    if (!near) return { phrase: [] as CaptionWord[], activeInPhrase: -1 };
    const startIdx = Math.max(0, words.indexOf(near) - 2);
    const endIdx = Math.min(words.length, startIdx + 8);
    return { phrase: words.slice(startIdx, endIdx), activeInPhrase: -1 };
  }
  let startIdx = active;
  while (startIdx > 0 && words[active].start - words[startIdx - 1].start < windowMs / 2) startIdx--;
  let endIdx = active + 1;
  while (endIdx < words.length && words[endIdx].start - words[active].start < windowMs / 2) endIdx++;
  return { phrase: words.slice(startIdx, endIdx), activeInPhrase: active - startIdx };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = reader.result as string;
      resolve(s.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// -------- Component --------

function CaptionAiPage() {
  const startFn = useServerFn(startTranscription);
  const pollFn = useServerFn(pollTranscription);

  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<"idle" | "transcribing" | "ready" | "exporting">("idle");
  const [words, setWords] = useState<CaptionWord[]>([]);
  const [styleId, setStyleId] = useState<StyleId>("tiktok-bold");
  const [currentMs, setCurrentMs] = useState(0);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportUrl, setExportUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const style = STYLES.find((s) => s.id === styleId)!;
  const { phrase, activeInPhrase } = useMemo(
    () => currentPhrase(words, currentMs),
    [words, currentMs],
  );

  const clearAll = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (exportUrl) URL.revokeObjectURL(exportUrl);
    setFile(null);
    setVideoUrl(null);
    setDurationSec(null);
    setWords([]);
    setPhase("idle");
    setCurrentMs(0);
    setExportUrl(null);
    setExportProgress(0);
  };

  const acceptFile = useCallback(
    async (f: File) => {
      if (!f.type.startsWith("video/")) {
        toast.error("Please upload a video file (MP4, MOV, WebM).");
        return;
      }
      // 40MB soft cap (base64 payload).
      if (f.size > 40 * 1024 * 1024) {
        toast.error("File too large. Please keep it under 40MB.");
        return;
      }
      const url = URL.createObjectURL(f);
      // Probe duration first.
      const probe = document.createElement("video");
      probe.preload = "metadata";
      probe.src = url;
      await new Promise<void>((resolve, reject) => {
        probe.onloadedmetadata = () => resolve();
        probe.onerror = () => reject(new Error("Could not read video metadata"));
      });
      const dur = probe.duration;
      if (!isFinite(dur) || dur <= 0) {
        URL.revokeObjectURL(url);
        toast.error("Could not read video. Try a different file.");
        return;
      }
      if (dur > 60.5) {
        URL.revokeObjectURL(url);
        toast.error(`Video is ${dur.toFixed(1)}s. Max is 60 seconds.`);
        return;
      }
      // Reset any previous state.
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (exportUrl) URL.revokeObjectURL(exportUrl);
      setExportUrl(null);
      setWords([]);
      setPhase("idle");
      setFile(f);
      setVideoUrl(url);
      setDurationSec(dur);
    },
    [videoUrl, exportUrl],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void acceptFile(f);
  };

  const generateCaptions = async () => {
    if (!file) return;
    setPhase("transcribing");
    setWords([]);
    try {
      toast.info("AI is transcribing and syncing audio…");
      const base64 = await fileToBase64(file);
      const { id } = await startFn({
        data: { base64, contentType: file.type || "video/mp4" },
      });
      // Poll every 2.5s, max ~2 min.
      for (let i = 0; i < 48; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        const res = await pollFn({ data: { id } });
        if (res.status === "completed") {
          setWords(res.words);
          setPhase("ready");
          toast.success(`Captions ready — ${res.words.length} words synced.`);
          return;
        }
      }
      throw new Error("Transcription timed out");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Transcription failed");
      setPhase("idle");
    }
  };

  // Keep currentMs in sync with the preview video.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let raf = 0;
    const tick = () => {
      setCurrentMs(v.currentTime * 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [videoUrl]);

  // -------- Canvas caption drawing (shared by export + could be used for preview) --------
  const drawCaption = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    tMs: number,
  ) => {
    if (words.length === 0) return;
    const { phrase, activeInPhrase } = currentPhrase(words, tMs);
    if (phrase.length === 0) return;

    const s = style.canvas;
    const fontSize = Math.max(14, height * s.fontSizePct);
    const fontSpec = s.font.replace("1em", `${fontSize}px`);
    ctx.font = fontSpec;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    const renderText = (w: CaptionWord) => (s.uppercase ? w.text.toUpperCase() : w.text);
    const gap = fontSize * 0.35;

    // Measure per-word widths.
    const widths = phrase.map((w) => ctx.measureText(renderText(w)).width);
    const totalWidth = widths.reduce((a, b) => a + b, 0) + gap * (phrase.length - 1);

    const maxWidth = width * 0.9;
    // Split into lines if too wide.
    const lines: { words: CaptionWord[]; widths: number[]; total: number }[] = [];
    if (totalWidth <= maxWidth) {
      lines.push({ words: phrase, widths, total: totalWidth });
    } else {
      let cur: CaptionWord[] = [];
      let curW: number[] = [];
      let curTotal = 0;
      for (let i = 0; i < phrase.length; i++) {
        const w = widths[i];
        const proj = curTotal + (cur.length ? gap : 0) + w;
        if (proj > maxWidth && cur.length) {
          lines.push({ words: cur, widths: curW, total: curTotal });
          cur = [phrase[i]];
          curW = [w];
          curTotal = w;
        } else {
          cur.push(phrase[i]);
          curW.push(w);
          curTotal = proj;
        }
      }
      if (cur.length) lines.push({ words: cur, widths: curW, total: curTotal });
    }

    const lineHeight = fontSize * 1.25;
    const blockHeight = lineHeight * lines.length;
    const centerY =
      s.align === "center" ? height / 2 : height - blockHeight / 2 - height * 0.08;

    // Background box for clean-minimal.
    if (s.background) {
      const pad = fontSize * (s.boxPaddingPct ? s.boxPaddingPct * 10 : 0.6);
      const boxW = Math.min(maxWidth + pad * 2, width * 0.94);
      const boxH = blockHeight + pad;
      const boxX = (width - boxW) / 2;
      const boxY = centerY - blockHeight / 2 - pad / 2;
      ctx.fillStyle = s.background;
      roundRect(ctx, boxX, boxY, boxW, boxH, fontSize * 0.4);
      ctx.fill();
    }

    // Draw each line.
    let flatIdx = 0;
    lines.forEach((line, li) => {
      const y = centerY - blockHeight / 2 + lineHeight * (li + 0.5);
      let x = (width - line.total) / 2;
      for (let i = 0; i < line.words.length; i++) {
        const w = line.words[i];
        const wtxt = renderText(w);
        const ww = line.widths[i];
        const isActive = flatIdx === activeInPhrase;
        let bounce = 0;
        if (isActive && s.bouncePct) {
          // Small bounce over the word's own duration.
          const t = (tMs - w.start) / Math.max(1, w.end - w.start);
          const eased = Math.sin(Math.min(1, Math.max(0, t)) * Math.PI);
          bounce = -fontSize * s.bouncePct * eased;
        }
        const cx = x + ww / 2;
        const cy = y + bounce;

        if (s.strokeWidth && s.strokeColor) {
          ctx.lineWidth = s.strokeWidth * (fontSize / 60);
          ctx.strokeStyle = s.strokeColor;
          ctx.lineJoin = "round";
          ctx.strokeText(wtxt, cx, cy);
        }
        ctx.fillStyle =
          s.highlight === "word" && isActive && s.highlightColor
            ? s.highlightColor
            : s.color;
        ctx.fillText(wtxt, cx, cy);

        x += ww + gap;
        flatIdx++;
      }
    });
  };

  // -------- Export via canvas + MediaRecorder --------
  const exportVideo = async () => {
    if (!file || !videoRef.current || words.length === 0) return;
    setPhase("exporting");
    setExportProgress(0);
    if (exportUrl) {
      URL.revokeObjectURL(exportUrl);
      setExportUrl(null);
    }

    try {
      // Use a hidden <video> so preview keeps playing normally.
      const src = document.createElement("video");
      src.src = URL.createObjectURL(file);
      src.muted = true; // needed for autoplay
      src.playsInline = true;
      await new Promise<void>((res, rej) => {
        src.onloadedmetadata = () => res();
        src.onerror = () => rej(new Error("Could not load video for export"));
      });

      const width = src.videoWidth;
      const height = src.videoHeight;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;

      // Video stream from canvas.
      const canvasStream = (canvas as HTMLCanvasElement).captureStream(30);

      // Audio from source video (via WebAudio to a MediaStream destination).
      let combined: MediaStream = canvasStream;
      try {
        const AudioCtx: typeof AudioContext =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        const srcNode = audioCtx.createMediaElementSource(src);
        const dest = audioCtx.createMediaStreamDestination();
        srcNode.connect(dest);
        // Also route to speakers muted-effectively (do NOT connect to destination to avoid audible playback).
        const audioTracks = dest.stream.getAudioTracks();
        combined = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);
      } catch (e) {
        console.warn("Audio capture failed, exporting silent video", e);
      }

      // Prefer MP4 when supported (Safari/newer Chrome), else WebM.
      const mimeCandidates = [
        "video/mp4;codecs=h264,aac",
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ];
      const mime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      const recorder = new MediaRecorder(combined, mime ? { mimeType: mime } : undefined);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      const done = new Promise<Blob>((resolve) => {
        recorder.onstop = () =>
          resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
      });

      recorder.start(250);
      src.currentTime = 0;
      await src.play();

      const duration = src.duration;
      let stopped = false;
      const drawLoop = () => {
        if (stopped) return;
        ctx.drawImage(src, 0, 0, width, height);
        drawCaption(ctx, width, height, src.currentTime * 1000);
        setExportProgress(Math.min(1, src.currentTime / duration));
        if (src.ended || src.currentTime >= duration - 0.05) {
          stopped = true;
          recorder.stop();
          return;
        }
        requestAnimationFrame(drawLoop);
      };
      requestAnimationFrame(drawLoop);

      const blob = await done;
      const outUrl = URL.createObjectURL(blob);
      setExportUrl(outUrl);
      setPhase("ready");
      setExportProgress(1);
      toast.success("Export complete — your download is ready.");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Export failed");
      setPhase("ready");
    }
  };

  const downloadExport = () => {
    if (!exportUrl) return;
    const isMp4 = exportUrl && (window as any).__lastExportMime !== "webm";
    // Guess extension from the recorder's mimeType stored on the blob via URL is hard; use .mp4/.webm based on support probe.
    const mp4Supported = MediaRecorder.isTypeSupported("video/mp4");
    const ext = mp4Supported ? "mp4" : "webm";
    const a = document.createElement("a");
    a.href = exportUrl;
    a.download = `captioned-video.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <PageShell
      eyebrow="New"
      title={
        <>
          Caption<span className="text-accent">AI</span>
        </>
      }
      description="Upload a clip up to 60 seconds. Get word-synced captions in three signature styles, then export the finished video."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px] pb-32">
        {/* Left: uploader / preview */}
        <div className="space-y-6">
          {!videoUrl ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative rounded-3xl border-2 border-dashed p-12 text-center cursor-pointer transition-all ${
                dragOver
                  ? "border-accent bg-accent/5 scale-[1.01]"
                  : "border-border/60 bg-elevated/30 hover:border-accent/60 hover:bg-elevated/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void acceptFile(f);
                  e.target.value = "";
                }}
              />
              <div className="mx-auto w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                <Upload className="w-7 h-7 text-accent" />
              </div>
              <div className="text-lg font-semibold">Drop a video here</div>
              <div className="text-sm text-muted-foreground mt-1">
                MP4, MOV, or WebM · up to 60 seconds · max 40MB
              </div>
              <button
                type="button"
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-accent-foreground font-medium hover:opacity-90 transition"
              >
                Choose file
              </button>
            </div>
          ) : (
            <div className="rounded-3xl border border-border/50 bg-elevated/30 overflow-hidden">
              <div className="relative bg-black" style={{ aspectRatio: "16 / 9" }}>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  playsInline
                  className="absolute inset-0 w-full h-full object-contain bg-black"
                />
                {/* Live caption overlay */}
                {words.length > 0 && phrase.length > 0 && (
                  <div
                    className="pointer-events-none absolute inset-0 flex items-end justify-center"
                    style={{
                      alignItems:
                        style.canvas.align === "center" ? "center" : "flex-end",
                      paddingBottom:
                        style.canvas.align === "bottom" ? "8%" : undefined,
                    }}
                  >
                    <LivePhrase
                      phrase={phrase}
                      activeInPhrase={activeInPhrase}
                      style={style}
                      currentMs={currentMs}
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between p-4 border-t border-border/40 gap-3 flex-wrap">
                <div className="text-sm text-muted-foreground truncate">
                  <span className="text-foreground font-medium">{file?.name}</span>
                  {durationSec && (
                    <> · {durationSec.toFixed(1)}s · {(file!.size / (1024 * 1024)).toFixed(1)}MB</>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={clearAll}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 text-sm hover:bg-elevated/50 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Generate / Export actions */}
          {videoUrl && (
            <div className="rounded-3xl border border-border/50 bg-elevated/30 p-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <button
                onClick={generateCaptions}
                disabled={phase === "transcribing" || phase === "exporting"}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-accent text-accent-foreground font-semibold hover:opacity-90 disabled:opacity-60 transition"
              >
                {phase === "transcribing" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI is transcribing and syncing audio…
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    {words.length > 0 ? "Regenerate captions" : "Generate captions"}
                  </>
                )}
              </button>
              <button
                onClick={exportVideo}
                disabled={
                  phase === "transcribing" ||
                  phase === "exporting" ||
                  words.length === 0
                }
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-border/60 bg-background/60 font-semibold hover:bg-elevated/60 disabled:opacity-50 transition"
              >
                {phase === "exporting" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting… {Math.round(exportProgress * 100)}%
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export video
                  </>
                )}
              </button>
            </div>
          )}

          {exportUrl && (
            <div className="rounded-3xl border border-accent/40 bg-accent/5 p-5 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm">
                <div className="font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  Your captioned video is ready
                </div>
                <div className="text-muted-foreground mt-1">
                  Captions are burned in with the {style.name} style.
                </div>
              </div>
              <button
                onClick={downloadExport}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-accent-foreground font-semibold hover:opacity-90 transition"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          )}
        </div>

        {/* Right: style sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground px-1">
            Caption style
          </div>
          <div className="space-y-2">
            {STYLES.map((s) => {
              const active = s.id === styleId;
              return (
                <button
                  key={s.id}
                  onClick={() => setStyleId(s.id)}
                  className={`w-full text-left rounded-2xl border p-4 transition-all ${
                    active
                      ? "border-accent bg-accent/10 shadow-[0_0_0_1px_hsl(var(--accent)/0.4)]"
                      : "border-border/50 bg-elevated/30 hover:border-border"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">{s.name}</div>
                    {active && (
                      <div className="text-[10px] uppercase tracking-widest text-accent">
                        Active
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {s.tagline}
                  </div>
                  <StylePreview style={s} />
                </button>
              );
            })}
          </div>
          <div className="text-[11px] text-muted-foreground px-1 leading-relaxed">
            Style changes apply instantly to the preview and to your exported video.
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

// -------- Preview subcomponents --------

function StylePreview({ style }: { style: CaptionStyle }) {
  const s = style.canvas;
  const isBold = style.id === "tiktok-bold";
  const isMin = style.id === "clean-minimal";
  return (
    <div
      className="mt-3 h-16 rounded-lg bg-gradient-to-br from-neutral-800 to-neutral-950 flex items-center justify-center overflow-hidden relative"
      style={{ alignItems: s.align === "bottom" ? "flex-end" : "center" }}
    >
      <div
        className="px-2 py-1"
        style={{
          background: s.background,
          borderRadius: 8,
          marginBottom: s.align === "bottom" ? 6 : 0,
        }}
      >
        <span
          style={{
            color: s.color,
            fontWeight: isMin ? 500 : 900,
            fontSize: isBold ? 14 : isMin ? 11 : 13,
            textTransform: s.uppercase ? "uppercase" : "none",
            WebkitTextStroke: s.strokeWidth
              ? `${Math.max(1, s.strokeWidth / 3)}px ${s.strokeColor}`
              : undefined,
            letterSpacing: 0.3,
          }}
        >
          {style.id === "dynamic-pop" ? (
            <>
              GO <span style={{ color: s.highlightColor }}>VIRAL</span> NOW
            </>
          ) : (
            "SAMPLE CAPTION"
          )}
        </span>
      </div>
    </div>
  );
}

function LivePhrase({
  phrase,
  activeInPhrase,
  style,
  currentMs,
}: {
  phrase: CaptionWord[];
  activeInPhrase: number;
  style: CaptionStyle;
  currentMs: number;
}) {
  const s = style.canvas;
  const wrap = (t: string) => (s.uppercase ? t.toUpperCase() : t);
  return (
    <div
      className="max-w-[90%] text-center px-3 py-1.5 rounded-lg"
      style={{
        background: s.background,
        color: s.color,
        fontWeight: s.font.includes("900") ? 900 : s.font.includes("800") ? 800 : 500,
        fontSize: `clamp(16px, 5vw, ${style.id === "tiktok-bold" ? 40 : style.id === "clean-minimal" ? 20 : 32}px)`,
        lineHeight: 1.15,
        letterSpacing: 0.3,
        WebkitTextStroke: s.strokeWidth
          ? `${Math.max(1, s.strokeWidth / 2)}px ${s.strokeColor}`
          : undefined,
        textShadow: s.strokeWidth ? undefined : "0 2px 6px rgba(0,0,0,0.6)",
      }}
    >
      {phrase.map((w, i) => {
        const active = i === activeInPhrase;
        let bounce = 0;
        if (active && s.bouncePct) {
          const t = (currentMs - w.start) / Math.max(1, w.end - w.start);
          const eased = Math.sin(Math.min(1, Math.max(0, t)) * Math.PI);
          bounce = -20 * s.bouncePct * eased;
        }
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `translateY(${bounce}px)`,
              color:
                s.highlight === "word" && active && s.highlightColor
                  ? s.highlightColor
                  : undefined,
              margin: "0 0.15em",
              transition: "color 60ms linear",
            }}
          >
            {wrap(w.text)}
          </span>
        );
      })}
    </div>
  );
}

// -------- Canvas rounded rect --------
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
