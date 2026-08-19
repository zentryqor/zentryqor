import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Upload, Copy, Download, Clock } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { startTranscription, pollSentences } from "@/lib/caption-ai.functions";

type Sentence = { text: string; start: number; end: number };

const MAX_BYTES = 60 * 1024 * 1024;

function stamp(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function srtStamp(ms: number) {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const msec = Math.floor(ms % 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(msec).padStart(3, "0")}`;
}

function toPlainText(sentences: Sentence[]) {
  return sentences
    .map((s) => `${stamp(s.start)} > ${stamp(s.end)}\n${s.text}`)
    .join("\n\n");
}

function toSrt(sentences: Sentence[]) {
  return sentences
    .map((s, i) => `${i + 1}\n${srtStamp(s.start)} --> ${srtStamp(s.end)}\n${s.text}\n`)
    .join("\n");
}

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

function SpeechTimestampsScreen() {
  const start = useServerFn(startTranscription);
  const poll = useServerFn(pollSentences);
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "transcribing" | "done">("idle");
  const [sentences, setSentences] = useState<Sentence[]>([]);

  async function run(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error("That file is larger than 60 MB — trim the clip and try again.");
      return;
    }
    setFileName(file.name);
    setSentences([]);
    setPhase("uploading");
    try {
      const base64 = await fileToBase64(file);
      const job = await start({ data: { base64, contentType: file.type || "video/mp4" } });
      setPhase("transcribing");

      for (let i = 0; i < 300; i++) {
        const res = await poll({ data: { id: job.id } });
        if (res.status === "completed") {
          if (!res.sentences.length) {
            toast.error("No speech was detected in that video.");
            setPhase("idle");
            return;
          }
          setSentences(res.sentences);
          setPhase("done");
          toast.success(`Transcribed ${res.sentences.length} sentences.`);
          return;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      throw new Error("Transcription is taking unusually long — try a shorter clip.");
    } catch (e) {
      setPhase("idle");
      toast.error(e instanceof Error ? e.message : "Transcription failed.");
    }
  }

  const busy = phase === "uploading" || phase === "transcribing";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="pt-24 pb-28 px-4">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <header className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-primary">
              <Clock className="h-3.5 w-3.5" /> Speech timestamps
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Turn spoken video into a timestamped script
            </h1>
            <p className="text-sm text-muted-foreground">
              Upload a video or audio file with speech. Every sentence comes back with its timing
              range above it, like <span className="text-foreground">0:01 &gt; 0:09</span>. Costs 50
              credits per run.
            </p>
          </header>

          <section className="glass-strong rounded-2xl p-5 space-y-4">
            <input
              ref={inputRef}
              type="file"
              accept="video/*,audio/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void run(f);
              }}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                className="liquid-btn"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {busy ? "Working…" : "Choose video or audio"}
              </Button>
              {fileName && (
                <span className="text-xs text-muted-foreground truncate max-w-[16rem]">
                  {fileName}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {phase === "uploading"
                ? "Uploading audio…"
                : phase === "transcribing"
                  ? "Detecting speech and sentence timings…"
                  : "MP4, MOV, MP3, WAV and more. Up to 60 MB."}
            </p>
          </section>

          {sentences.length > 0 && (
            <section className="glass-strong rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">
                  Script · {sentences.length} sentences
                </h2>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="liquid-btn"
                    onClick={async () => {
                      await navigator.clipboard.writeText(toPlainText(sentences));
                      toast.success("Script copied");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="liquid-btn"
                    onClick={() => download("script.txt", toPlainText(sentences))}
                  >
                    <Download className="h-3.5 w-3.5" /> .txt
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="liquid-btn"
                    onClick={() => download("script.srt", toSrt(sentences))}
                  >
                    <Download className="h-3.5 w-3.5" /> .srt
                  </Button>
                </div>
              </div>

              <ol className="space-y-4">
                {sentences.map((s, i) => (
                  <li key={i} className="space-y-1">
                    <div className="font-mono text-xs text-primary">
                      {stamp(s.start)} &gt; {stamp(s.end)}
                    </div>
                    <p className="text-sm leading-relaxed">{s.text}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/speech-timestamps")({
  head: () => ({
    meta: [
      { title: "Speech Timestamps — Zentry Qor" },
      {
        name: "description",
        content:
          "Upload a talking video and get a clean script where every sentence is labelled with its timing range, ready to copy or export as .txt or .srt.",
      },
      { property: "og:title", content: "Speech Timestamps — Zentry Qor" },
      {
        property: "og:description",
        content: "Turn spoken video into a timestamped script in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpeechTimestampsScreen,
});
