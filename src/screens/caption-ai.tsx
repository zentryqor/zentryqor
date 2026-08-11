import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Download,
  FolderOpen,
  Loader2,
  Palette,
  Plus,
  Save,
  Scissors,
  Sparkles,
  Trash2,
  Type,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import {
  startTranscription,
  pollTranscription,
  type CaptionWord,
} from "@/lib/caption-ai.functions";
import { AppHeader, AppHeaderLink } from "@/components/AppHeader";
import { ProfileMenu } from "@/components/ProfileMenu";
import { FirstVisitTutorial } from "@/components/FirstVisitTutorial";

import { useQuery } from "@tanstack/react-query";
import { getAiCredits } from "@/lib/ai.functions";
import { getExportSettings, saveExportSettings } from "@/lib/export-settings.functions";
import {
  deleteCaptionFont,
  deleteCaptionProject,
  ensureFontLoaded,
  listCaptionFonts,
  listCaptionProjects,
  saveCaptionProject,
  signedFontUrl,
  signedVideoUrl,
  uploadCaptionFont,
  uploadProjectVideo,
  type CaptionCut,
  type CaptionFontRow,
  type CaptionProjectRow,
} from "@/lib/caption-projects";

/** A transcript word plus optional per-word font/colour overrides. */
type EditWord = CaptionWord & { font?: string; color?: string };






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

function currentPhrase<T extends CaptionWord>(words: T[], currentMs: number, windowMs = 2600) {
  const active = findActiveIndex(words, currentMs);
  if (active === -1) {
    const near = words.find(
      (w) => Math.abs(w.start - currentMs) < 400 || Math.abs(w.end - currentMs) < 400,
    );
    if (!near) return { phrase: [] as T[], activeInPhrase: -1 };

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

export function CaptionAiScreen() {
  const startFn = useServerFn(startTranscription);
  const pollFn = useServerFn(pollTranscription);

  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<"idle" | "transcribing" | "ready" | "exporting">("idle");
  const [words, setWords] = useState<EditWord[]>([]);
  // Timeline / cutting
  const [cuts, setCuts] = useState<CaptionCut[]>([]);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [selectedWord, setSelectedWord] = useState<number | null>(null);
  // Colour + font customisation
  const [colorOverride, setColorOverride] = useState<string | null>(null);
  const [fontFamily, setFontFamily] = useState<string | null>(null);
  const [fontUrl, setFontUrl] = useState<string | null>(null);
  // Projects
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [savingProject, setSavingProject] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);

  const [styleId, setStyleId] = useState<StyleId>("tiktok-bold");
  const [sizeMult, setSizeMult] = useState(1);
  const [currentMs, setCurrentMs] = useState(0);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState<
    "idle" | "preparing" | "burning" | "recording" | "finalizing"
  >("idle");
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [qualityScale, setQualityScale] = useState<"source" | "1080" | "720" | "480">("source");
  const [bitrateMbps, setBitrateMbps] = useState<number>(6);

  // ---- Persisted export settings (per user) ----
  const fetchExportSettings = useServerFn(getExportSettings);
  const persistExportSettings = useServerFn(saveExportSettings);
  const settingsLoaded = useRef(false);
  const { data: savedSettings } = useQuery({
    queryKey: ["export-settings"],
    queryFn: () => fetchExportSettings(),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!savedSettings || settingsLoaded.current) return;
    settingsLoaded.current = true;
    setQualityScale(savedSettings.resolution);
    setBitrateMbps(savedSettings.bitrateMbps);
  }, [savedSettings]);

  // Debounced write-back so the next export opens with the same choices.
  useEffect(() => {
    if (!settingsLoaded.current) return;
    const t = setTimeout(() => {
      persistExportSettings({
        data: { resolution: qualityScale, bitrateMbps },
      }).catch(() => {});
    }, 700);
    return () => clearTimeout(t);
  }, [qualityScale, bitrateMbps, persistExportSettings]);



  // Live credit balance for the inline CaptionAI badge
  const fetchCredits = useServerFn(getAiCredits);
  const { data: credits } = useQuery({
    queryKey: ["ai-credits"],
    queryFn: () => fetchCredits(),
    staleTime: 15_000,
  });
  const canAffordGenerate = (credits?.remaining ?? 0) >= 50;


  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const style = STYLES.find((s) => s.id === styleId) ?? STYLES[0];
  const effectiveStyle: CaptionStyle = useMemo(
    () => ({
      ...style,
      canvas: {
        ...style.canvas,
        fontSizePct: style.canvas.fontSizePct * sizeMult,
        ...(fontFamily ? { fontFamily: `"${fontFamily}", ${SANS}` } : {}),
        ...(colorOverride ? { color: colorOverride, secondColor: undefined } : {}),
      },
    }),
    [style, sizeMult, fontFamily, colorOverride],
  );
  const { phrase, activeInPhrase } = useMemo(
    () => currentPhrase(words, currentMs),
    [words, currentMs],
  );

  // ---- Fonts from storage ----
  const { data: fonts, refetch: refetchFonts } = useQuery({
    queryKey: ["caption-fonts"],
    queryFn: listCaptionFonts,
    staleTime: 60_000,
  });
  useEffect(() => {
    if (!fonts) return;
    void (async () => {
      for (const f of fonts) {
        try {
          await ensureFontLoaded(f.family, await signedFontUrl(f.storage_path));
        } catch {
          /* ignore a single bad font */
        }
      }
    })();
  }, [fonts]);

  const pickFont = async (f: CaptionFontRow | null) => {
    if (!f) {
      setFontFamily(null);
      setFontUrl(null);
      return;
    }
    try {
      const url = await signedFontUrl(f.storage_path);
      await ensureFontLoaded(f.family, url);
      setFontFamily(f.family);
      setFontUrl(url);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load font");
    }
  };

  const applyWordFont = async (i: number, f: CaptionFontRow | null) => {
    if (f) {
      try {
        await ensureFontLoaded(f.family, await signedFontUrl(f.storage_path));
      } catch {
        toast.error("Could not load font");
        return;
      }
    }
    updateWord(i, { font: f ? f.family : undefined });
  };

  const clearAll = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (exportUrl) URL.revokeObjectURL(exportUrl);
    setFile(null);
    setVideoUrl(null);
    setDurationSec(null);
    setWords([]);
    setCuts([]);
    setSelection(null);
    setSelectedWord(null);
    setPhase("idle");
    setCurrentMs(0);
    setExportUrl(null);
    setExportProgress(0);
    setExportStage("idle");
    setExportError(null);
    setProjectId(null);
    setProjectName("");
    setVideoPath(null);
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

  // Keep currentMs in sync with the preview video, on the *edited* timeline,
  // and skip over any cut regions during playback.
  const cutsRef = useRef<CaptionCut[]>([]);
  cutsRef.current = cuts;
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let raf = 0;
    const tick = () => {
      const ms = v.currentTime * 1000;
      const inside = cutsRef.current.find((c) => ms >= c.start && ms < c.end - 30);
      if (inside) {
        v.currentTime = inside.end / 1000;
      } else {
        let shift = 0;
        for (const c of cutsRef.current) if (ms >= c.end) shift += c.end - c.start;
        setCurrentMs(Math.max(0, ms - shift));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [videoUrl]);


  // -------- Transcript editor helpers --------
  const updateWord = (i: number, patch: Partial<EditWord>) => {
    setWords((prev) => prev.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
  };
  const deleteWord = (i: number) => {
    setWords((prev) => prev.filter((_, idx) => idx !== i));
    setSelectedWord(null);
  };
  const addWordAfter = (i: number) => {
    setWords((prev) => {
      const cur = prev[i];
      const next = prev[i + 1];
      const start = cur ? cur.end + 20 : 0;
      const end = next ? Math.max(start + 100, (start + next.start) / 2) : start + 400;
      const nw: EditWord = { text: "new", start, end };
      return [...prev.slice(0, i + 1), nw, ...prev.slice(i + 1)];
    });
  };

  // -------- Cutting --------
  const cutMs = cuts.reduce((a, c) => a + (c.end - c.start), 0);
  /** Length of the timeline after cuts (what the export will be). */
  const totalMs = Math.max(0, (durationSec ?? 0) * 1000 - cutMs);

  /** Maps an edited-timeline position back to a source video time (cuts re-added). */
  const editedToSource = useCallback(
    (ms: number) => {
      let out = ms;
      for (const c of [...cuts].sort((a, b) => a.start - b.start)) {
        if (out >= c.start) out += c.end - c.start;
      }
      return out;
    },
    [cuts],
  );

  /** Removes a range of the edited timeline: words inside go, later words shift left. */
  const cutRange = (startMs: number, endMs: number) => {
    const a = Math.max(0, Math.min(startMs, endMs));
    const b = Math.max(0, Math.max(startMs, endMs));
    if (b - a < 40) {
      toast.error("Select a longer range to cut.");
      return;
    }
    const srcA = editedToSource(a);
    const srcB = editedToSource(b);
    setCuts((prev) => [...prev, { start: srcA, end: srcB }].sort((x, y) => x.start - y.start));
    setWords((prev) =>
      prev
        .filter((w) => !(w.end > a && w.start < b))
        .map((w) => (w.start >= b ? { ...w, start: w.start - (b - a), end: w.end - (b - a) } : w)),
    );
    setSelection(null);
    setSelectedWord(null);
    toast.success(`Cut ${((b - a) / 1000).toFixed(2)}s`);
  };


  const removeCut = (i: number) => setCuts((prev) => prev.filter((_, idx) => idx !== i));


  const seekEdited = (ms: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = editedToSource(ms) / 1000;
  };

  // -------- Projects --------
  const { data: projects, refetch: refetchProjects } = useQuery({
    queryKey: ["caption-projects"],
    queryFn: listCaptionProjects,
    staleTime: 30_000,
  });

  const persistProject = useCallback(
    async (opts?: { silent?: boolean; nameHint?: string }) => {
      if (!file && !videoPath) return;
      setSavingProject(true);
      try {
        let path = videoPath;
        if (!path && file) {
          path = await uploadProjectVideo(file);
          setVideoPath(path);
        }
        const name = projectName || opts?.nameHint || file?.name || "Untitled project";
        const id = await saveCaptionProject({
          id: projectId,
          name,
          videoPath: path,
          videoName: file?.name ?? null,
          durationSec: durationSec,
          words,
          cuts,
          styleId,
          sizeMult,
          colorOverride,
          fontUrl,
          fontFamily,
        });
        setProjectId(id);
        setProjectName(name);
        void refetchProjects();
        if (!opts?.silent) toast.success("Project saved — you can edit it later.");
      } catch (e: any) {
        toast.error(e?.message ?? "Could not save project");
      } finally {
        setSavingProject(false);
      }
    },
    [
      file,
      videoPath,
      projectId,
      projectName,
      durationSec,
      words,
      cuts,
      styleId,
      sizeMult,
      colorOverride,
      fontUrl,
      fontFamily,
      refetchProjects,
    ],
  );

  const openProject = async (p: CaptionProjectRow) => {
    try {
      if (!p.video_path) throw new Error("This project has no video attached.");
      const url = await signedVideoUrl(p.video_path);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (exportUrl) URL.revokeObjectURL(exportUrl);
      setExportUrl(null);
      setFile(null);
      setVideoPath(p.video_path);
      setVideoUrl(url);
      setDurationSec(p.duration_sec ? Number(p.duration_sec) : null);
      setWords(Array.isArray(p.words) ? (p.words as EditWord[]) : []);
      setCuts(Array.isArray(p.cuts) ? (p.cuts as CaptionCut[]) : []);
      setStyleId(p.style_id ?? "tiktok-bold");
      setSizeMult(Number(p.size_mult ?? 1));
      setColorOverride(p.color_override);
      setFontFamily(p.font_family);
      setFontUrl(p.font_url);
      if (p.font_family) {
        const match = fonts?.find((f) => f.family === p.font_family);
        if (match) {
          try {
            await ensureFontLoaded(match.family, await signedFontUrl(match.storage_path));
          } catch {}
        }
      }
      setProjectId(p.id);
      setProjectName(p.name);
      setPhase(Array.isArray(p.words) && p.words.length > 0 ? "ready" : "idle");
      setProjectsOpen(false);
      toast.success(`Opened “${p.name}”`);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open project");
    }
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

    const renderText = (w: EditWord) => (s.uppercase ? w.text.toUpperCase() : w.text);
    const gap = fontSize * 0.35;
    const fontFor = (w: EditWord) =>
      w.font
        ? buildFontSpec({ ...s, fontFamily: `"${w.font}", ${SANS}` }, fontSize)
        : buildFontSpec(s, fontSize);

    const widths = phrase.map((w) => {
      ctx.font = fontFor(w);
      return ctx.measureText(renderText(w)).width;
    });
    const totalWidth = widths.reduce((a, b) => a + b, 0) + gap * (phrase.length - 1);

    const maxWidth = width * 0.9;
    const lines: { words: EditWord[]; widths: number[]; total: number; startIdx: number }[] = [];

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
        ctx.font = fontFor(w);

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

        // colour: per-word override wins, then two-tone, then style colour
        const baseColor = w.color ?? (flatIdx > 0 && s.secondColor ? s.secondColor : s.color);
        ctx.fillStyle =
          w.color
            ? w.color
            : s.highlight === "word" && isActive && s.highlightColor
              ? s.highlightColor
              : baseColor;
        ctx.fillText(wtxt, cx, cy);


        ctx.shadowBlur = 0;
        x += ww + gap;
      }
    });
  };

  // -------- Live export preview (target resolution + bitrate simulation) --------
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scratchRef = useRef<HTMLCanvasElement | null>(null);
  const [previewDims, setPreviewDims] = useState<{ w: number; h: number } | null>(null);

  const targetDims = useCallback(() => {
    const v = videoRef.current;
    const srcW = v?.videoWidth ?? 0;
    const srcH = v?.videoHeight ?? 0;
    if (!srcW || !srcH) return null;
    let targetH = srcH;
    if (qualityScale === "1080") targetH = Math.min(srcH, 1080);
    else if (qualityScale === "720") targetH = Math.min(srcH, 720);
    else if (qualityScale === "480") targetH = Math.min(srcH, 480);
    const scale = targetH / srcH;
    return {
      w: Math.max(2, Math.round((srcW * scale) / 2) * 2),
      h: Math.max(2, Math.round((srcH * scale) / 2) * 2),
    };
  }, [qualityScale]);

  const drawCaptionRef = useRef(drawCaption);
  drawCaptionRef.current = drawCaption;

  useEffect(() => {
    if (!videoUrl) {
      setPreviewDims(null);
      return;
    }
    let raf = 0;
    let stopped = false;

    const paint = () => {
      if (stopped) return;
      raf = requestAnimationFrame(paint);
      const v = videoRef.current;
      const canvas = previewCanvasRef.current;
      if (!v || !canvas || !v.videoWidth) return;
      const dims = targetDims();
      if (!dims) return;

      if (canvas.width !== dims.w || canvas.height !== dims.h) {
        canvas.width = dims.w;
        canvas.height = dims.h;
        setPreviewDims(dims);
      }
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;

      // Approximate encoder softness at the chosen bitrate: bits-per-pixel-per-frame
      // below ~0.1 starts visibly degrading thin caption outlines.
      const bpp = (bitrateMbps * 1_000_000) / (dims.w * dims.h * 30);
      const q = Math.max(0.4, Math.min(1, Math.sqrt(bpp / 0.1)));

      try {
        if (q >= 0.995) {
          ctx.drawImage(v, 0, 0, dims.w, dims.h);
          drawCaptionRef.current(ctx, dims.w, dims.h, v.currentTime * 1000);
        } else {
          const scratch = scratchRef.current ?? document.createElement("canvas");
          scratchRef.current = scratch;
          const sw = Math.max(2, Math.round(dims.w * q));
          const sh = Math.max(2, Math.round(dims.h * q));
          if (scratch.width !== sw || scratch.height !== sh) {
            scratch.width = sw;
            scratch.height = sh;
          }
          const sctx = scratch.getContext("2d", { alpha: false });
          if (!sctx) return;
          sctx.drawImage(v, 0, 0, sw, sh);
          drawCaptionRef.current(sctx, sw, sh, v.currentTime * 1000);
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(scratch, 0, 0, dims.w, dims.h);
        }
      } catch {
        /* frame not decodable yet */
      }
    };

    raf = requestAnimationFrame(paint);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [videoUrl, qualityScale, bitrateMbps, targetDims]);


  // -------- Export via canvas + MediaRecorder --------
  const exportExtRef = useRef<string>("mp4");

  const exportVideo = async () => {
    if ((!file && !videoUrl) || words.length === 0) return;
    setPhase("exporting");
    setExportProgress(0);
    setExportError(null);
    setExportStage("preparing");
    if (exportUrl) {
      URL.revokeObjectURL(exportUrl);
      setExportUrl(null);
    }

    let srcUrl: string | null = null;
    let audioCtx: AudioContext | null = null;
    let tempSrc: HTMLVideoElement | null = null;
    try {
      const src = document.createElement("video");
      tempSrc = src;
      srcUrl = file ? URL.createObjectURL(file) : null;
      src.crossOrigin = "anonymous";
      src.src = srcUrl ?? videoUrl!;

      src.playsInline = true;
      src.preload = "auto";
      // Keep it out of view but attached so decoding is not throttled.
      src.style.cssText =
        "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
      document.body.appendChild(src);

      const waitEvent = (el: HTMLVideoElement, ev: string, ms: number) =>
        new Promise<void>((res) => {
          let done = false;
          const on = () => {
            if (done) return;
            done = true;
            el.removeEventListener(ev, on);
            res();
          };
          el.addEventListener(ev, on, { once: true });
          setTimeout(on, ms);
        });

      await new Promise<void>((res, rej) => {
        const ok = () => res();
        src.addEventListener("loadeddata", ok, { once: true });
        src.addEventListener(
          "error",
          () => rej(new Error("Could not load video for export")),
          { once: true },
        );
        setTimeout(() => (src.readyState >= 2 ? res() : rej(new Error("Video load timed out"))), 20000);
      });

      // Blob-sourced videos often report Infinity until forced to seek.
      let duration = src.duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        src.currentTime = 1e101;
        await waitEvent(src, "timeupdate", 3000);
        duration = Number.isFinite(src.duration) && src.duration > 0 ? src.duration : src.currentTime;
        src.currentTime = 0;
        await waitEvent(src, "seeked", 3000);
      }
      if (!Number.isFinite(duration) || duration <= 0) {
        const last = words[words.length - 1];
        duration = last ? last.end / 1000 + 0.5 : 5;
      }

      const srcW = src.videoWidth;
      const srcH = src.videoHeight;
      if (!srcW || !srcH) throw new Error("Video has no dimensions");

      let targetH = srcH;
      if (qualityScale === "1080") targetH = Math.min(srcH, 1080);
      else if (qualityScale === "720") targetH = Math.min(srcH, 720);
      else if (qualityScale === "480") targetH = Math.min(srcH, 480);
      const scale = targetH / srcH;
      const width = Math.max(2, Math.round((srcW * scale) / 2) * 2);
      const height = Math.max(2, Math.round((srcH * scale) / 2) * 2);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { alpha: false })!;

      // Rewind and paint the first frame before the recorder starts.
      if (src.currentTime > 0.01) {
        src.currentTime = 0;
        await waitEvent(src, "seeked", 3000);
      }
      ctx.drawImage(src, 0, 0, width, height);
      drawCaption(ctx, width, height, 0);

      setExportStage("burning");

      const canvasStream = (canvas as HTMLCanvasElement).captureStream(30);
      let combined: MediaStream = canvasStream;
      let hasAudio = false;
      try {
        const AudioCtx: typeof AudioContext =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AudioCtx();
        if (audioCtx.state === "suspended") await audioCtx.resume();
        const srcNode = audioCtx.createMediaElementSource(src);
        const dest = audioCtx.createMediaStreamDestination();
        // Route only into the recording destination so export stays silent
        // for the user while audio is still captured into the file.
        srcNode.connect(dest);
        const audioTracks = dest.stream.getAudioTracks();
        if (audioTracks.length > 0) {
          hasAudio = true;
          combined = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);
        }
      } catch (e) {
        console.warn("Audio capture failed, exporting silent video", e);
      }

      const mimeCandidates = hasAudio
        ? [
            "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
            "video/mp4;codecs=h264,aac",
            "video/mp4",
            "video/webm;codecs=vp9,opus",
            "video/webm;codecs=vp8,opus",
            "video/webm",
          ]
        : [
            "video/mp4;codecs=avc1.42E01E",
            "video/mp4",
            "video/webm;codecs=vp9",
            "video/webm",
          ];
      const mime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      const recorder = new MediaRecorder(combined, {
        ...(mime ? { mimeType: mime } : {}),
        videoBitsPerSecond: Math.round(bitrateMbps * 1_000_000),
        ...(hasAudio ? { audioBitsPerSecond: 128_000 } : {}),
      });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      const done = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          if (chunks.length === 0) {
            reject(new Error("Export produced no data. Try Chrome for best results."));
            return;
          }
          resolve(new Blob(chunks, { type: recorder.mimeType || mime || "video/webm" }));
        };
        recorder.onerror = (ev: any) =>
          reject(new Error(ev?.error?.message ?? "MediaRecorder failed"));
      });

      recorder.start(1000);
      src.muted = false;
      src.volume = 1;
      await src.play();
      setExportStage("recording");

      let stopped = false;
      const finish = async () => {
        if (stopped) return;
        stopped = true;
        setExportStage("finalizing");
        // Hold the last frame briefly so the final caption is encoded.
        try {
          ctx.drawImage(src, 0, 0, width, height);
          drawCaption(ctx, width, height, duration * 1000);
        } catch {}
        await new Promise((r) => setTimeout(r, 400));
        try { recorder.requestData(); } catch {}
        await new Promise((r) => setTimeout(r, 200));
        try { src.pause(); } catch {}
        try { if (recorder.state !== "inactive") recorder.stop(); } catch {}
      };
      src.addEventListener("ended", () => void finish(), { once: true });

      // Hard safety stop: never run longer than the clip + 5s.
      const guard = setTimeout(() => void finish(), (duration + 5) * 1000);

      const useRVFC = typeof (src as any).requestVideoFrameCallback === "function";
      const sortedCuts = [...cuts].sort((a, b) => a.start - b.start);
      const toEdited = (ms: number) => {
        let shift = 0;
        for (const c of sortedCuts) if (ms >= c.end) shift += c.end - c.start;
        return Math.max(0, ms - shift);
      };
      const paint = () => {
        if (stopped) return;
        const ms = src.currentTime * 1000;
        // Jump over cut regions so they never make it into the recording.
        const inside = sortedCuts.find((c) => ms >= c.start && ms < c.end - 30);
        if (inside) {
          src.currentTime = inside.end / 1000;
          if (useRVFC) (src as any).requestVideoFrameCallback(paint);
          else requestAnimationFrame(paint);
          return;
        }
        try {
          ctx.drawImage(src, 0, 0, width, height);
          drawCaption(ctx, width, height, toEdited(ms));
        } catch {}
        setExportProgress(Math.min(0.99, src.currentTime / duration));
        if (src.ended || src.currentTime >= duration - 0.02) {
          void finish();
          return;
        }
        if (useRVFC) (src as any).requestVideoFrameCallback(paint);
        else requestAnimationFrame(paint);
      };

      if (useRVFC) (src as any).requestVideoFrameCallback(paint);
      else requestAnimationFrame(paint);

      const blob = await done;
      clearTimeout(guard);

      const type = blob.type || mime;
      exportExtRef.current = type.includes("mp4") ? "mp4" : "webm";

      const outUrl = URL.createObjectURL(blob);
      setExportUrl(outUrl);
      setPhase("ready");
      setExportProgress(1);
      setExportStage("idle");
      toast.success(
        `Export complete — ${exportExtRef.current.toUpperCase()}${hasAudio ? " with audio" : " (no audio track found)"}.`,
      );
      try { src.pause(); } catch {}
      if (src.parentNode) src.parentNode.removeChild(src);
      if (audioCtx) { try { await audioCtx.close(); } catch {} }
      if (srcUrl) URL.revokeObjectURL(srcUrl);
    } catch (e: any) {
      console.error(e);
      const msg = e?.message ?? "Export failed";
      setExportError(msg);
      toast.error(msg);
      setPhase("ready");
      setExportStage("idle");
      try { tempSrc?.pause(); } catch {}
      if (tempSrc?.parentNode) tempSrc.parentNode.removeChild(tempSrc);
      if (audioCtx) { try { await audioCtx.close(); } catch {} }
      if (srcUrl) URL.revokeObjectURL(srcUrl);
    }
  };

  const downloadExport = () => {
    if (!exportUrl) return;
    const a = document.createElement("a");
    a.href = exportUrl;
    a.download = `captioned-video.${exportExtRef.current}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const estMb =
    durationSec && durationSec > 0
      ? ((bitrateMbps + 0.128) * durationSec) / 8
      : null;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <AppHeader
        nav={
          <>
            <AppHeaderLink to="/dashboard">Dashboard</AppHeaderLink>
            <AppHeaderLink to="/assets">Vault</AppHeaderLink>
            <AppHeaderLink to="/ai">AI Studio</AppHeaderLink>
            <AppHeaderLink to="/caption-ai" active>CaptionAI</AppHeaderLink>
          </>
        }
        right={<ProfileMenu />}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-32">
      <FirstVisitTutorial
        storageKey="tutorial:caption-ai:v1"
        title="CaptionAI"
        steps={[
          { title: "Drop a video (up to 60s)", body: "MP4, MOV, or WebM under 40MB. We probe duration client-side before anything hits the server." },
          { title: "Generate captions — 50 credits", body: "AI transcribes with word-level timing. You can then edit any word's text and start/end time in the transcript editor." },
          { title: "Style, size, export", body: "Pick from 20+ presets and tweak caption size, then hit Export. We burn the captions onto the video right in your browser." },
        ]}
      />

      {/* Header band */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.035em] leading-[1.03]">
            Caption<span className="text-primary">AI</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-xl leading-relaxed">
            Drop a clip up to 60 seconds, fix the transcript and timings, pick a style,
            then burn captions in and export.
          </p>
        </div>

        <div className="glass rounded-2xl px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold tabular-nums">
                {credits ? `${credits.remaining} credits` : "Loading…"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                50 per generation
                {credits ? ` · ${credits.limit}/day` : ""}
              </div>
            </div>
          </div>
          {!canAffordGenerate && credits && (
            <Link
              to="/billing"
              className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
            >
              Get more
            </Link>
          )}
        </div>
      </div>

      {/* Projects bar */}
      <div className="mb-6 rounded-2xl border border-border/50 bg-elevated/30 p-3 sm:p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <FolderOpen className="w-4 h-4 shrink-0 text-primary" />
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Untitled project"
              className="min-w-0 flex-1 bg-transparent border border-border/40 rounded-full px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setProjectsOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 text-xs hover:bg-elevated/60 transition"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Projects{projects?.length ? ` (${projects.length})` : ""}
            </button>
            <button
              onClick={() => void persistProject()}
              disabled={savingProject || (!file && !videoPath)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 hover:opacity-90 transition"
            >
              {savingProject ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        </div>

        {projectsOpen && (
          <div className="mt-3 space-y-1.5 max-h-64 overflow-y-auto">
            {(projects ?? []).length === 0 && (
              <div className="text-xs text-muted-foreground px-1 py-2">
                No saved projects yet — transcribe a clip and hit Save.
              </div>
            )}
            {(projects ?? []).map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-border/40 bg-background/40 px-3 py-2"
              >
                <button
                  onClick={() => void openProject(p)}
                  className="min-w-0 text-left"
                >
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(p.updated_at).toLocaleString()}
                    {p.duration_sec ? ` · ${Number(p.duration_sec).toFixed(1)}s` : ""}
                  </div>
                </button>
                <button
                  onClick={async () => {
                    try {
                      await deleteCaptionProject(p);
                      if (projectId === p.id) setProjectId(null);
                      void refetchProjects();
                      toast.success("Project deleted");
                    } catch (e: any) {
                      toast.error(e?.message ?? "Could not delete");
                    }
                  }}
                  className="shrink-0 p-1.5 rounded-md border border-border/40 text-destructive hover:bg-destructive/15"
                  title="Delete project"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] pb-32">


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
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border/60 bg-elevated/30 hover:border-primary/60 hover:bg-elevated/50"
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
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Upload className="w-7 h-7 text-primary" />
              </div>
              <div className="text-lg font-semibold">Drop a video here</div>
              <div className="text-sm text-muted-foreground mt-1">
                MP4, MOV, or WebM · up to 60 seconds · max 40MB
              </div>
              <button
                type="button"
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
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
            <div className="rounded-3xl border border-border/50 bg-elevated/30 p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <div>
                  <div className="text-sm font-semibold">Export preview</div>
                  <div className="text-xs text-muted-foreground">
                    Exactly what gets burned in, rendered at your export resolution with the
                    softening your bitrate introduces. Play the clip to check readability.
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground tabular-nums">
                  {previewDims ? `${previewDims.w}×${previewDims.h}` : "—"} · {bitrateMbps} Mbps
                  {estMb ? ` · ≈ ${estMb < 10 ? estMb.toFixed(1) : Math.round(estMb)} MB` : ""}
                </div>
              </div>
              <div className="relative rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: previewDims ? `${previewDims.w} / ${previewDims.h}` : "16 / 9" }}>
                <canvas
                  ref={previewCanvasRef}
                  className="absolute inset-0 w-full h-full object-contain"
                />
                {words.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                    Generate captions to preview the burned-in text.
                  </div>
                )}
              </div>
            </div>
          )}



          {videoUrl && (
            <div className="rounded-3xl border border-border/50 bg-elevated/30 p-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <button
                onClick={generateCaptions}
                disabled={phase === "transcribing" || phase === "exporting" || !canAffordGenerate}
                title={!canAffordGenerate ? "Not enough credits — need 50" : undefined}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-60 transition"
              >
                {phase === "transcribing" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Transcribing…
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    {words.length > 0 ? "Regenerate (50 cr)" : "Generate captions (50 cr)"}
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

          {/* Export progress / retry panel */}
          {(phase === "exporting" || exportError) && (
            <div className="rounded-3xl border border-border/50 bg-elevated/30 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold">
                  {exportError ? "Export failed" : "Exporting video"}
                </div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {Math.round(exportProgress * 100)}%
                </div>
              </div>
              <div className="h-2 rounded-full bg-foreground/10 overflow-hidden">
                <div
                  className={`h-full transition-all ${exportError ? "bg-destructive" : "bg-gradient-to-r from-primary to-primary-glow"}`}
                  style={{ width: `${Math.max(4, exportProgress * 100)}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-[11px]">
                {(
                  [
                    ["preparing", "Preparing"],
                    ["burning", "Burning captions"],
                    ["recording", "Recording"],
                    ["finalizing", "Finalizing"],
                  ] as const
                ).map(([id, label]) => {
                  const order = ["preparing", "burning", "recording", "finalizing"] as const;
                  const idx = order.indexOf(id);
                  const curIdx = order.indexOf(exportStage as any);
                  const state =
                    exportError ? (idx <= curIdx ? "error" : "pending")
                    : curIdx === -1 ? "pending"
                    : idx < curIdx ? "done"
                    : idx === curIdx ? "active"
                    : "pending";
                  return (
                    <div
                      key={id}
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 ${
                        state === "active"
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : state === "done"
                          ? "border-primary/30 bg-primary/5 text-foreground"
                          : state === "error"
                          ? "border-destructive/50 bg-destructive/10 text-destructive"
                          : "border-border/40 text-muted-foreground"
                      }`}
                    >
                      {state === "active" && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span className="truncate">{label}</span>
                    </div>
                  );
                })}
              </div>
              {exportError && (
                <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-xs text-muted-foreground">{exportError}</div>
                  <button
                    onClick={() => void exportVideo()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    Retry export
                  </button>
                </div>
              )}
            </div>
          )}

          {exportUrl && (
            <div className="rounded-3xl border border-primary/40 bg-primary/5 p-5 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm">
                <div className="font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Your captioned video is ready
                </div>
                <div className="text-muted-foreground mt-1">
                  Burned in with the {style.name} style · {qualityScale === "source" ? "source" : `${qualityScale}p`} · {bitrateMbps} Mbps.
                </div>
              </div>
              <button
                onClick={downloadExport}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 transition"
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
                          ? "border-primary bg-primary/10"
                          : "border-border/40 bg-background/40"
                      }`}
                    >
                      <input
                        value={w.text}
                        onChange={(e) => updateWord(i, { text: e.target.value })}
                        className="bg-transparent border border-border/40 rounded-md px-2 py-1 outline-none focus:border-primary"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={(w.start / 1000).toFixed(2)}
                        onChange={(e) =>
                          updateWord(i, { start: Math.max(0, parseFloat(e.target.value) * 1000 || 0) })
                        }
                        className="bg-transparent border border-border/40 rounded-md px-2 py-1 outline-none focus:border-primary tabular-nums"
                        title="Start (s)"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={(w.end / 1000).toFixed(2)}
                        onChange={(e) =>
                          updateWord(i, { end: Math.max(0, parseFloat(e.target.value) * 1000 || 0) })
                        }
                        className="bg-transparent border border-border/40 rounded-md px-2 py-1 outline-none focus:border-primary tabular-nums"
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
              style={{ ["--zq-range-progress" as string]: `${((sizeMult - 0.5) / 1.5) * 100}%` }}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>Small</span>
              <span>Default</span>
              <span>Huge</span>
            </div>
          </div>

          {/* Export settings */}
          <div className="rounded-2xl border border-border/50 bg-elevated/30 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Export settings
              </div>
              {estMb && (
                <div className="text-[11px] tabular-nums text-foreground">
                  ≈ {estMb < 10 ? estMb.toFixed(1) : Math.round(estMb)} MB
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ["Small", "720", 3],
                  ["Balanced", "1080", 6],
                  ["Max", "source", 12],
                ] as const
              ).map(([label, res, br]) => {
                const active = qualityScale === res && bitrateMbps === br;
                return (
                  <button
                    key={label}
                    onClick={() => {
                      setQualityScale(res);
                      setBitrateMbps(br);
                    }}
                    className={`text-[11px] rounded-xl py-2 border transition ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 hover:border-border text-muted-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div>
              <div className="text-[11px] text-muted-foreground mb-1.5">Resolution</div>
              <div className="grid grid-cols-4 gap-1.5">
                {(["source", "1080", "720", "480"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setQualityScale(v)}
                    className={`text-[11px] rounded-lg py-1.5 border transition ${
                      qualityScale === v
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 hover:border-border text-muted-foreground"
                    }`}
                  >
                    {v === "source" ? "Source" : `${v}p`}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                <span>Bitrate</span>
                <span className="tabular-nums text-foreground">{bitrateMbps} Mbps</span>
              </div>
              <input
                type="range"
                min={1}
                max={16}
                step={1}
                value={bitrateMbps}
                onChange={(e) => setBitrateMbps(parseInt(e.target.value, 10))}
                style={{ ["--zq-range-progress" as string]: `${((bitrateMbps - 1) / 15) * 100}%` }}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Smaller file</span>
                <span>Sharper text</span>
              </div>
              {bitrateMbps <= 2 && (
                <div className="mt-2 text-[10px] text-muted-foreground">
                  Very low bitrate can soften thin caption outlines. Keep 720p or above for readable text.
                </div>
              )}
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
                      ? "border-primary bg-primary/10"
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
      </main>
    </div>

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
