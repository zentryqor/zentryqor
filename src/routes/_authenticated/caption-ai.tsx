import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Download,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
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
import { FirstVisitTutorial } from "@/components/FirstVisitTutorial";

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
  component: CaptionAiPage,
});

// -------- Caption styles --------

type StyleId = string;

type CaptionCanvas = {
  fontFamily?: string; // css family
  weight?: number;
  italic?: boolean;
  fontSizePct: number; // % of video height
  color: string;
  secondColor?: string; // 2nd word onward color (two-tone)
  strokeColor?: string;
  strokeWidth?: number;
  align: "center" | "bottom";
  background?: string; // fill for a rounded box behind whole phrase
  boxPaddingPct?: number;
  uppercase?: boolean;
  highlightColor?: string; // active word text color
  activeBoxColor?: string; // box behind active word
  highlight?: "word" | "none";
  bouncePct?: number;
  glowColor?: string;
  glowBlur?: number; // px @ 720p
  letterSpacingPct?: number;
};

type CaptionStyle = {
  id: StyleId;
  name: string;
  canvas: CaptionCanvas;
};

const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

const STYLES: CaptionStyle[] = [
  {
    id: "brown-yellow",
    name: "Brown Bold",
    canvas: { fontFamily: SANS, weight: 900, fontSizePct: 0.075, color: "#F5B301", strokeColor: "#000", strokeWidth: 6, align: "center", uppercase: true },
  },
  {
    id: "quick-white",
    name: "Quick White",
    canvas: { fontFamily: SANS, weight: 900, fontSizePct: 0.075, color: "#fff", strokeColor: "#000", strokeWidth: 5, align: "center", uppercase: true },
  },
  {
    id: "brown-lower",
    name: "Brown Lower",
    canvas: { fontFamily: SANS, weight: 800, fontSizePct: 0.07, color: "#F5B301", align: "center", uppercase: false },
  },
  {
    id: "quick-outline",
    name: "Outline White",
    canvas: { fontFamily: SANS, weight: 800, fontSizePct: 0.065, color: "#fff", strokeColor: "#000", strokeWidth: 4, align: "center", uppercase: true, letterSpacingPct: 0.02 },
  },
  {
    id: "quick-cyan",
    name: "Cyan Pop",
    canvas: { fontFamily: SANS, weight: 900, fontSizePct: 0.07, color: "#7FE7FF", strokeColor: "#000", strokeWidth: 5, align: "center", uppercase: true, glowColor: "#22D3EE", glowBlur: 8 },
  },
  {
    id: "quick-yellow-shadow",
    name: "Yellow Shadow",
    canvas: { fontFamily: SANS, weight: 900, fontSizePct: 0.07, color: "#FFD400", strokeColor: "#000", strokeWidth: 4, align: "center", uppercase: true, glowColor: "rgba(255,212,0,0.7)", glowBlur: 10 },
  },
  {
    id: "brown-fox-purple",
    name: "Two-Tone Purple",
    canvas: { fontFamily: SANS, weight: 900, fontSizePct: 0.07, color: "#F5B301", secondColor: "#C084FC", strokeColor: "#000", strokeWidth: 5, align: "center", uppercase: true },
  },
  {
    id: "quick-green-neon",
    name: "Green Neon",
    canvas: { fontFamily: SANS, weight: 900, fontSizePct: 0.07, color: "#A8FF60", strokeColor: "#000", strokeWidth: 4, align: "center", uppercase: true, glowColor: "#39FF14", glowBlur: 14 },
  },
  {
    id: "quick-green-lower",
    name: "Green Lower",
    canvas: { fontFamily: SANS, weight: 800, fontSizePct: 0.07, color: "#39FF14", align: "center", uppercase: false, glowColor: "#39FF14", glowBlur: 12 },
  },
  {
    id: "muted-serif",
    name: "Muted Serif",
    canvas: { fontFamily: SERIF, weight: 500, fontSizePct: 0.055, color: "#B8B8B8", align: "center", uppercase: true, letterSpacingPct: 0.04 },
  },
  {
    id: "clean-white",
    name: "Clean White",
    canvas: { fontFamily: SANS, weight: 700, fontSizePct: 0.055, color: "#fff", align: "center", uppercase: true },
  },
  {
    id: "yellow-pill",
    name: "Yellow Pill",
    canvas: { fontFamily: SANS, weight: 900, fontSizePct: 0.065, color: "#000", background: "#FFD400", boxPaddingPct: 0.06, align: "center", uppercase: true },
  },
  {
    id: "the-quick-clean",
    name: "Bottom Clean",
    canvas: { fontFamily: SANS, weight: 600, fontSizePct: 0.05, color: "#fff", align: "bottom", background: "rgba(0,0,0,0.55)", boxPaddingPct: 0.05, highlight: "none" },
  },
  {
    id: "highlight-green",
    name: "Green Highlight",
    canvas: { fontFamily: SANS, weight: 900, fontSizePct: 0.06, color: "#fff", activeBoxColor: "#22C55E", strokeColor: "#000", strokeWidth: 3, align: "center", uppercase: true, highlight: "word" },
  },
  {
    id: "highlight-purple",
    name: "Purple Highlight",
    canvas: { fontFamily: SANS, weight: 900, fontSizePct: 0.06, color: "#fff", activeBoxColor: "#A855F7", strokeColor: "#000", strokeWidth: 3, align: "center", uppercase: true, highlight: "word" },
  },
  {
    id: "highlight-yellow",
    name: "Yellow Highlight",
    canvas: { fontFamily: SANS, weight: 900, fontSizePct: 0.06, color: "#fff", activeBoxColor: "#FACC15", strokeColor: "#000", strokeWidth: 3, align: "center", uppercase: true, highlight: "word" },
  },
  {
    id: "serif-italic",
    name: "Serif Italic",
    canvas: { fontFamily: SERIF, weight: 500, italic: true, fontSizePct: 0.055, color: "#EDEDED", align: "center", uppercase: false },
  },
  {
    id: "tiktok-bold",
    name: "TikTok Bold",
    canvas: { fontFamily: SANS, weight: 900, fontSizePct: 0.075, color: "#FFEB3B", strokeColor: "#000", strokeWidth: 6, align: "center", uppercase: true },
  },
  {
    id: "dynamic-pop",
    name: "Dynamic Pop",
    canvas: { fontFamily: SANS, weight: 900, fontSizePct: 0.06, color: "#fff", strokeColor: "#000", strokeWidth: 4, align: "center", highlight: "word", highlightColor: "#22D3EE", bouncePct: 0.12, uppercase: true },
  },
  {
    id: "red-block",
    name: "Red Block",
    canvas: { fontFamily: SANS, weight: 900, fontSizePct: 0.06, color: "#fff", activeBoxColor: "#DC2626", strokeColor: "#000", strokeWidth: 3, align: "center", uppercase: true, highlight: "word" },
  },
];

// -------- Helpers --------

function findActiveIndex(words: CaptionWord[], currentMs: number) {
  for (let i = 0; i < words.length; i++) {
    if (currentMs >= words[i].start && currentMs <= words[i].end) return i;
  }
  return -1;
}

function currentPhrase(words: CaptionWord[], currentMs: number, windowMs = 2600) {
  const active = findActiveIndex(words, currentMs);
  if (active === -1) {
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

function buildFontSpec(s: CaptionCanvas, fontSize: number) {
  const italic = s.italic ? "italic " : "";
  return `${italic}${s.weight ?? 700} ${fontSize}px ${s.fontFamily ?? SANS}`;
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
  const [sizeMult, setSizeMult] = useState(1);
  const [currentMs, setCurrentMs] = useState(0);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportUrl, setExportUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const style = STYLES.find((s) => s.id === styleId) ?? STYLES[0];
  const effectiveStyle: CaptionStyle = useMemo(
    () => ({ ...style, canvas: { ...style.canvas, fontSizePct: style.canvas.fontSizePct * sizeMult } }),
    [style, sizeMult],
  );
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
      if (f.size > 40 * 1024 * 1024) {
        toast.error("File too large. Please keep it under 40MB.");
        return;
      }
      const url = URL.createObjectURL(f);
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

  // -------- Transcript editor helpers --------
  const updateWord = (i: number, patch: Partial<CaptionWord>) => {
    setWords((prev) => prev.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
  };
  const deleteWord = (i: number) => {
    setWords((prev) => prev.filter((_, idx) => idx !== i));
  };
  const addWordAfter = (i: number) => {
    setWords((prev) => {
      const cur = prev[i];
      const next = prev[i + 1];
      const start = cur ? cur.end + 20 : 0;
      const end = next ? Math.max(start + 100, (start + next.start) / 2) : start + 400;
      const nw: CaptionWord = { text: "new", start, end };
      return [...prev.slice(0, i + 1), nw, ...prev.slice(i + 1)];
    });
  };

  // -------- Canvas caption drawing (shared by export) --------
  const drawCaption = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    tMs: number,
  ) => {
    if (words.length === 0) return;
    const { phrase, activeInPhrase } = currentPhrase(words, tMs);
    if (phrase.length === 0) return;

    const s = effectiveStyle.canvas;
    const fontSize = Math.max(14, height * s.fontSizePct);
    ctx.font = buildFontSpec(s, fontSize);
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    const renderText = (w: CaptionWord) => (s.uppercase ? w.text.toUpperCase() : w.text);
    const gap = fontSize * 0.35;

    const widths = phrase.map((w) => ctx.measureText(renderText(w)).width);
    const totalWidth = widths.reduce((a, b) => a + b, 0) + gap * (phrase.length - 1);

    const maxWidth = width * 0.9;
    const lines: { words: CaptionWord[]; widths: number[]; total: number; startIdx: number }[] = [];
    if (totalWidth <= maxWidth) {
      lines.push({ words: phrase, widths, total: totalWidth, startIdx: 0 });
    } else {
      let cur: CaptionWord[] = [];
      let curW: number[] = [];
      let curTotal = 0;
      let startI = 0;
      for (let i = 0; i < phrase.length; i++) {
        const w = widths[i];
        const proj = curTotal + (cur.length ? gap : 0) + w;
        if (proj > maxWidth && cur.length) {
          lines.push({ words: cur, widths: curW, total: curTotal, startIdx: startI });
          startI = i;
          cur = [phrase[i]];
          curW = [w];
          curTotal = w;
        } else {
          cur.push(phrase[i]);
          curW.push(w);
          curTotal = proj;
        }
      }
      if (cur.length) lines.push({ words: cur, widths: curW, total: curTotal, startIdx: startI });
    }

    const lineHeight = fontSize * 1.25;
    const blockHeight = lineHeight * lines.length;
    const centerY =
      s.align === "center" ? height / 2 : height - blockHeight / 2 - height * 0.08;

    if (s.background) {
      const pad = fontSize * (s.boxPaddingPct ?? 0.06) * 6;
      const boxW = Math.min(maxWidth + pad, width * 0.94);
      const boxH = blockHeight + pad * 0.6;
      const boxX = (width - boxW) / 2;
      const boxY = centerY - blockHeight / 2 - pad * 0.3;
      ctx.fillStyle = s.background;
      roundRect(ctx, boxX, boxY, boxW, boxH, fontSize * 0.4);
      ctx.fill();
    }

    lines.forEach((line, li) => {
      const y = centerY - blockHeight / 2 + lineHeight * (li + 0.5);
      let x = (width - line.total) / 2;
      for (let i = 0; i < line.words.length; i++) {
        const w = line.words[i];
        const wtxt = renderText(w);
        const ww = line.widths[i];
        const flatIdx = line.startIdx + i;
        const isActive = flatIdx === activeInPhrase;
        let bounce = 0;
        if (isActive && s.bouncePct) {
          const t = (tMs - w.start) / Math.max(1, w.end - w.start);
          const eased = Math.sin(Math.min(1, Math.max(0, t)) * Math.PI);
          bounce = -fontSize * s.bouncePct * eased;
        }
        const cx = x + ww / 2;
        const cy = y + bounce;

        // Active-word box (highlight background)
        if (isActive && s.activeBoxColor) {
          const pad = fontSize * 0.25;
          ctx.fillStyle = s.activeBoxColor;
          roundRect(ctx, x - pad * 0.5, cy - fontSize * 0.65, ww + pad, fontSize * 1.25, fontSize * 0.2);
          ctx.fill();
        }

        // Glow
        if (s.glowColor) {
          ctx.shadowColor = s.glowColor;
          ctx.shadowBlur = (s.glowBlur ?? 8) * (fontSize / 40);
        } else {
          ctx.shadowBlur = 0;
        }

        if (s.strokeWidth && s.strokeColor) {
          ctx.lineWidth = s.strokeWidth * (fontSize / 60);
          ctx.strokeStyle = s.strokeColor;
          ctx.lineJoin = "round";
          ctx.strokeText(wtxt, cx, cy);
        }

        // color: second word onwards uses secondColor if set
        const baseColor = flatIdx > 0 && s.secondColor ? s.secondColor : s.color;
        ctx.fillStyle =
          s.highlight === "word" && isActive && s.highlightColor
            ? s.highlightColor
            : baseColor;
        ctx.fillText(wtxt, cx, cy);

        ctx.shadowBlur = 0;
        x += ww + gap;
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
      const src = document.createElement("video");
      src.src = URL.createObjectURL(file);
      src.muted = true;
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

      const canvasStream = (canvas as HTMLCanvasElement).captureStream(30);
      let combined: MediaStream = canvasStream;
      try {
        const AudioCtx: typeof AudioContext =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        const srcNode = audioCtx.createMediaElementSource(src);
        const dest = audioCtx.createMediaStreamDestination();
        srcNode.connect(dest);
        const audioTracks = dest.stream.getAudioTracks();
        combined = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);
      } catch (e) {
        console.warn("Audio capture failed, exporting silent video", e);
      }

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
      description="Upload a clip up to 60 seconds. Edit transcript & timings, tweak the size, pick from 20+ styles, then export."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_340px] pb-32">
        {/* Left column */}
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
                {words.length > 0 && phrase.length > 0 && (
                  <div
                    className="pointer-events-none absolute inset-0 flex justify-center"
                    style={{
                      alignItems:
                        effectiveStyle.canvas.align === "center" ? "center" : "flex-end",
                      paddingBottom:
                        effectiveStyle.canvas.align === "bottom" ? "8%" : undefined,
                    }}
                  >
                    <LivePhrase
                      phrase={phrase}
                      activeInPhrase={activeInPhrase}
                      style={effectiveStyle}
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
                <button
                  onClick={clearAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 text-sm hover:bg-elevated/50 transition"
                >
                  <X className="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>
            </div>
          )}

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
                    Transcribing…
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
                  phase === "transcribing" || phase === "exporting" || words.length === 0
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
                  Burned in with the {style.name} style.
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

          {/* Transcript editor */}
          {words.length > 0 && (
            <div className="rounded-3xl border border-border/50 bg-elevated/30 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold">Transcript editor</div>
                  <div className="text-xs text-muted-foreground">
                    Edit the word, tweak start/end timings, or delete. Changes apply live to the preview and export.
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{words.length} words</div>
              </div>
              <div className="max-h-[420px] overflow-y-auto pr-2 space-y-1.5">
                {words.map((w, i) => {
                  const active = i === findActiveIndex(words, currentMs);
                  return (
                    <div
                      key={i}
                      className={`grid grid-cols-[1fr_84px_84px_auto_auto] gap-2 items-center rounded-xl border p-2 text-xs transition ${
                        active
                          ? "border-accent bg-accent/10"
                          : "border-border/40 bg-background/40"
                      }`}
                    >
                      <input
                        value={w.text}
                        onChange={(e) => updateWord(i, { text: e.target.value })}
                        className="bg-transparent border border-border/40 rounded-md px-2 py-1 outline-none focus:border-accent"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={(w.start / 1000).toFixed(2)}
                        onChange={(e) =>
                          updateWord(i, { start: Math.max(0, parseFloat(e.target.value) * 1000 || 0) })
                        }
                        className="bg-transparent border border-border/40 rounded-md px-2 py-1 outline-none focus:border-accent tabular-nums"
                        title="Start (s)"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={(w.end / 1000).toFixed(2)}
                        onChange={(e) =>
                          updateWord(i, { end: Math.max(0, parseFloat(e.target.value) * 1000 || 0) })
                        }
                        className="bg-transparent border border-border/40 rounded-md px-2 py-1 outline-none focus:border-accent tabular-nums"
                        title="End (s)"
                      />
                      <button
                        onClick={() => {
                          const v = videoRef.current;
                          if (v) v.currentTime = w.start / 1000;
                        }}
                        className="px-2 py-1 rounded-md border border-border/40 hover:bg-elevated/60"
                        title="Jump to this word"
                      >
                        ▶
                      </button>
                      <div className="flex gap-1">
                        <button
                          onClick={() => addWordAfter(i)}
                          className="p-1 rounded-md border border-border/40 hover:bg-elevated/60"
                          title="Insert word after"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteWord(i)}
                          className="p-1 rounded-md border border-border/40 hover:bg-destructive/20 hover:border-destructive/60 text-destructive"
                          title="Delete word"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {/* Size slider */}
          <div className="rounded-2xl border border-border/50 bg-elevated/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Caption size
              </div>
              <div className="text-xs font-mono tabular-nums">{sizeMult.toFixed(2)}×</div>
            </div>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.05}
              value={sizeMult}
              onChange={(e) => setSizeMult(parseFloat(e.target.value))}
              className="w-full accent-[hsl(var(--accent))]"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>Small</span>
              <span>Default</span>
              <span>Huge</span>
            </div>
          </div>

          <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground px-1">
            Caption style
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-[70vh] overflow-y-auto pr-1">
            {STYLES.map((s) => {
              const active = s.id === styleId;
              return (
                <button
                  key={s.id}
                  onClick={() => setStyleId(s.id)}
                  className={`text-left rounded-xl border p-2 transition-all ${
                    active
                      ? "border-accent bg-accent/10"
                      : "border-border/50 bg-elevated/30 hover:border-border"
                  }`}
                >
                  <StylePreview style={s} />
                  <div className="text-[11px] font-medium mt-1.5 truncate">{s.name}</div>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

// -------- Preview subcomponents --------

function StylePreview({ style }: { style: CaptionStyle }) {
  const s = style.canvas;
  const words = ["THE", "QUICK"];
  return (
    <div
      className="h-14 rounded-lg bg-gradient-to-br from-neutral-800 to-neutral-950 flex items-center justify-center overflow-hidden relative px-2"
      style={{ alignItems: s.align === "bottom" ? "flex-end" : "center", paddingBottom: s.align === "bottom" ? 4 : 0 }}
    >
      <div
        className="px-1.5 py-0.5 flex gap-1"
        style={{
          background: s.background,
          borderRadius: 6,
        }}
      >
        {words.map((w, i) => {
          const isSecond = i === 1;
          const color = isSecond && s.secondColor ? s.secondColor : s.color;
          const isActive = i === 1 && (s.activeBoxColor || s.highlight === "word");
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                background: isActive && s.activeBoxColor ? s.activeBoxColor : undefined,
                padding: isActive && s.activeBoxColor ? "0 4px" : undefined,
                borderRadius: 4,
                color: isActive && s.highlightColor ? s.highlightColor : color,
                fontFamily: s.fontFamily,
                fontWeight: s.weight ?? 700,
                fontStyle: s.italic ? "italic" : undefined,
                fontSize: 12,
                textTransform: s.uppercase ? "uppercase" : "none",
                WebkitTextStroke: s.strokeWidth
                  ? `${Math.max(0.5, (s.strokeWidth ?? 0) / 4)}px ${s.strokeColor}`
                  : undefined,
                textShadow: s.glowColor
                  ? `0 0 6px ${s.glowColor}, 0 0 2px ${s.glowColor}`
                  : undefined,
                letterSpacing: s.letterSpacingPct ? `${s.letterSpacingPct * 12}px` : undefined,
              }}
            >
              {s.uppercase ? w : w.toLowerCase()}
            </span>
          );
        })}
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
  const baseSize = s.fontSizePct * 100; // vh-ish; will use as vh below
  return (
    <div
      className="max-w-[90%] text-center px-3 py-1.5 rounded-lg"
      style={{
        background: s.background,
        color: s.color,
        fontFamily: s.fontFamily,
        fontWeight: s.weight ?? 700,
        fontStyle: s.italic ? "italic" : undefined,
        fontSize: `clamp(14px, ${baseSize * 0.9}cqh, ${baseSize * 1.4}px)`,
        lineHeight: 1.15,
        letterSpacing: s.letterSpacingPct ? `${s.letterSpacingPct}em` : undefined,
        WebkitTextStroke: s.strokeWidth
          ? `${Math.max(1, (s.strokeWidth ?? 0) / 2)}px ${s.strokeColor}`
          : undefined,
        textShadow: s.glowColor
          ? `0 0 8px ${s.glowColor}, 0 0 16px ${s.glowColor}`
          : s.strokeWidth
            ? undefined
            : "0 2px 6px rgba(0,0,0,0.6)",
        containerType: "size",
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
        const isSecondTone = i > 0 && s.secondColor;
        const bg = active && s.activeBoxColor ? s.activeBoxColor : undefined;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `translateY(${bounce}px)`,
              background: bg,
              padding: bg ? "0 0.2em" : undefined,
              borderRadius: bg ? "0.15em" : undefined,
              color:
                active && s.highlightColor
                  ? s.highlightColor
                  : isSecondTone
                    ? s.secondColor
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
