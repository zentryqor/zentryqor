import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarClock,
  Layers,
  Loader2,
  Trash2,
  Upload,
  X as XIcon,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { ProfileMenu } from "@/components/ProfileMenu";
import { supabase } from "@/integrations/supabase/client";
import { createSignedUploadUrl } from "@/lib/scheduler.functions";
import { createPostSeries } from "@/lib/post-series.functions";
import { listSocialAccounts } from "@/lib/social.functions";

export const Route = createFileRoute("/_authenticated/poster/series/new")({
  head: () => ({ meta: [{ title: "New series — Zentry Qor" }] }),
  component: NewSeries,
});

type Cadence =
  | "daily"
  | "every_n_days"
  | "weekdays"
  | "custom_days";

type Clip = {
  file: File;
  title: string;
  caption: string;
  uploadedPath: string | null;
  progress: "idle" | "uploading" | "done" | "error";
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function todayLocal() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function NewSeries() {
  const nav = useNavigate();
  const list = useServerFn(listSocialAccounts);
  const sign = useServerFn(createSignedUploadUrl);
  const create = useServerFn(createPostSeries);

  const accountsQuery = useQuery({
    queryKey: ["social-accounts"],
    queryFn: () => list(),
  });
  const ytConnected = (accountsQuery.data ?? []).some(
    (a) => a.platform === "youtube" && !a.revoked_at,
  );

  const [name, setName] = useState("My series");
  const [clips, setClips] = useState<Clip[]>([]);
  const [cadence, setCadence] = useState<Cadence>("daily");
  const [intervalDays, setIntervalDays] = useState(2);
  const [customDays, setCustomDays] = useState<number[]>([1, 3, 5]);
  const [timeOfDay, setTimeOfDay] = useState("17:00");
  const [startDate, setStartDate] = useState(todayLocal());
  const [privacy, setPrivacy] = useState<"public" | "unlisted" | "private">(
    "public",
  );
  const [madeForKids, setMadeForKids] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function addFiles(fs: FileList | null) {
    if (!fs) return;
    const next: Clip[] = [];
    for (const f of Array.from(fs)) {
      if (!f.type.startsWith("video/")) continue;
      next.push({
        file: f,
        title: f.name.replace(/\.[^.]+$/, "").slice(0, 100),
        caption: "",
        uploadedPath: null,
        progress: "idle",
      });
    }
    setClips((prev) => [...prev, ...next].slice(0, 100));
  }

  const preview = useMemo(() => {
    const [hh, mm] = timeOfDay.split(":").map(Number);
    const [y, mo, d] = startDate.split("-").map(Number);
    const cursor = new Date(y, mo - 1, d);
    const slots: Date[] = [];
    const wanted = (n: number) => {
      if (cadence === "daily") return true;
      if (cadence === "every_n_days") return n % intervalDays === 0;
      const wd = cursor.getDay();
      if (cadence === "weekdays") return wd >= 1 && wd <= 5;
      return customDays.includes(wd);
    };
    let step = 0;
    let safety = 0;
    while (slots.length < clips.length && safety++ < 3650) {
      if (wanted(step)) {
        const s = new Date(cursor);
        s.setHours(hh, mm, 0, 0);
        slots.push(s);
      }
      cursor.setDate(cursor.getDate() + 1);
      step++;
    }
    return slots;
  }, [cadence, intervalDays, customDays, timeOfDay, startDate, clips.length]);

  async function uploadOne(idx: number) {
    const clip = clips[idx];
    if (!clip || clip.uploadedPath) return clip?.uploadedPath ?? null;
    setClips((cs) =>
      cs.map((c, i) => (i === idx ? { ...c, progress: "uploading" } : c)),
    );
    try {
      const signed = await sign({
        data: {
          filename: clip.file.name,
          contentType: clip.file.type || "video/mp4",
        },
      });
      const up = await supabase.storage
        .from("social-uploads")
        .uploadToSignedUrl(signed.path, signed.token, clip.file, {
          contentType: clip.file.type || "video/mp4",
          upsert: false,
        });
      if (up.error) throw new Error(up.error.message);
      setClips((cs) =>
        cs.map((c, i) =>
          i === idx
            ? { ...c, uploadedPath: signed.path, progress: "done" }
            : c,
        ),
      );
      return signed.path;
    } catch (e: any) {
      setClips((cs) =>
        cs.map((c, i) => (i === idx ? { ...c, progress: "error" } : c)),
      );
      throw e;
    }
  }

  const mut = useMutation({
    mutationFn: async () => {
      if (!ytConnected) throw new Error("Connect YouTube first");
      if (clips.length === 0) throw new Error("Add at least one video");
      const paths: string[] = [];
      for (let i = 0; i < clips.length; i++) {
        const p = await uploadOne(i);
        if (!p) throw new Error(`Clip ${i + 1} failed to upload`);
        paths.push(p);
      }
      return create({
        data: {
          name,
          cadence: {
            type: cadence,
            intervalDays,
            weekdays: cadence === "custom_days" ? customDays : [],
            timeOfDay,
            startDate,
            tzOffsetMinutes: -new Date().getTimezoneOffset(),
          },
          youtube: {
            privacyStatus: privacy,
            madeForKids,
            notifySubscribers: true,
          },
          clips: clips.map((c, i) => ({
            videoPath: paths[i],
            title: c.title || undefined,
            caption: c.caption || "",
          })),
        },
      });
    },
    onSuccess: (r) => {
      toast.success(`Series created — ${r.scheduled} posts queued.`);
      nav({ to: "/poster" });
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't create series"),
  });

  const busy = mut.isPending;

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <AnimatedOrbs />
      <AppHeader right={<ProfileMenu />} />

      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-40">
        <Link
          to="/poster"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Poster
        </Link>

        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl glass-strong flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              New series
            </h1>
            <p className="text-muted-foreground mt-1">
              Upload a batch of videos once and let Zentry Qor drip them out on
              your cadence.
            </p>
          </div>
        </div>

        {!ytConnected && (
          <div className="glass-strong rounded-2xl p-4 mb-5 text-sm text-amber-300">
            Connect YouTube on the Poster page before creating a series.
          </div>
        )}

        {/* Name */}
        <div className="glass-strong rounded-2xl p-5 mb-5">
          <label className="text-sm font-medium">Series name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 120))}
            className="mt-3 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
          />
        </div>

        {/* Videos */}
        <div className="glass-strong rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-medium">Videos</div>
              <div className="text-xs text-muted-foreground">
                {clips.length} / 100 · one post per clip
              </div>
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-xl glass-strong px-3 py-2 text-xs font-medium hover:bg-white/[0.06] inline-flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" /> Add videos
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              multiple
              onChange={(e) => addFiles(e.target.files)}
              className="hidden"
            />
          </div>

          {clips.length === 0 ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl border border-dashed border-white/15 p-8 hover:bg-white/[0.03] flex flex-col items-center justify-center gap-2 text-sm"
            >
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span>Click to select multiple videos</span>
              <span className="text-xs text-muted-foreground">
                MP4 recommended · up to 100
              </span>
            </button>
          ) : (
            <ul className="space-y-2">
              {clips.map((c, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-white/10 p-3 flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <input
                      value={c.title}
                      onChange={(e) =>
                        setClips((cs) =>
                          cs.map((x, j) =>
                            j === i
                              ? { ...x, title: e.target.value.slice(0, 100) }
                              : x,
                          ),
                        )
                      }
                      placeholder="Title"
                      className="w-full rounded-lg bg-black/30 border border-white/10 px-2 py-1.5 text-sm focus:outline-none focus:border-white/25"
                    />
                    <div className="text-[11px] text-muted-foreground truncate">
                      {c.file.name} · {(c.file.size / 1024 / 1024).toFixed(1)}{" "}
                      MB
                      {preview[i] && (
                        <>
                          {" · "}
                          <span className="text-foreground/80">
                            {preview[i].toLocaleString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setClips((cs) => cs.filter((_, j) => j !== i))
                    }
                    className="rounded-lg p-2 text-muted-foreground hover:text-red-400 hover:bg-white/[0.06] shrink-0"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Cadence */}
        <div className="glass-strong rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="w-4 h-4 text-muted-foreground" />
            <div className="text-sm font-medium">Cadence</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {(
              [
                ["daily", "Daily"],
                ["weekdays", "Weekdays"],
                ["every_n_days", "Every N days"],
                ["custom_days", "Custom days"],
              ] as [Cadence, string][]
            ).map(([v, label]) => (
              <button
                type="button"
                key={v}
                onClick={() => setCadence(v)}
                className={
                  "rounded-xl border px-3 py-2 text-xs " +
                  (cadence === v
                    ? "border-white/40 bg-white/10"
                    : "border-white/10 hover:bg-white/[0.03]")
                }
              >
                {label}
              </button>
            ))}
          </div>

          {cadence === "every_n_days" && (
            <div className="mb-4">
              <label className="text-xs text-muted-foreground">
                Every N days
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={intervalDays}
                onChange={(e) =>
                  setIntervalDays(
                    Math.max(1, Math.min(30, Number(e.target.value) || 1)),
                  )
                }
                className="mt-1 w-28 rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
              />
            </div>
          )}

          {cadence === "custom_days" && (
            <div className="mb-4">
              <div className="text-xs text-muted-foreground mb-2">
                Days of the week
              </div>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((d, i) => {
                  const on = customDays.includes(i);
                  return (
                    <button
                      type="button"
                      key={i}
                      onClick={() =>
                        setCustomDays((cd) =>
                          on ? cd.filter((x) => x !== i) : [...cd, i].sort(),
                        )
                      }
                      className={
                        "rounded-lg px-3 py-1.5 text-xs border " +
                        (on
                          ? "border-white/40 bg-white/10"
                          : "border-white/10 hover:bg-white/[0.03]")
                      }
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Time of day
              </label>
              <input
                type="time"
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
              />
            </div>
          </div>

          {clips.length > 0 && preview.length > 0 && (
            <div className="mt-4 text-xs text-muted-foreground">
              First post{" "}
              <span className="text-foreground">
                {preview[0].toLocaleString()}
              </span>
              , last post{" "}
              <span className="text-foreground">
                {preview[preview.length - 1].toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* YouTube defaults */}
        <div className="glass-strong rounded-2xl p-5 mb-5">
          <div className="text-sm font-medium mb-3">YouTube defaults</div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {(["public", "unlisted", "private"] as const).map((v) => (
              <button
                type="button"
                key={v}
                onClick={() => setPrivacy(v)}
                className={
                  "rounded-xl border px-3 py-2 text-xs capitalize " +
                  (privacy === v
                    ? "border-white/40 bg-white/10"
                    : "border-white/10 hover:bg-white/[0.03]")
                }
              >
                {v}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={madeForKids}
              onChange={(e) => setMadeForKids(e.target.checked)}
              className="accent-white"
            />
            Made for kids
          </label>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Link
            to="/poster"
            className="rounded-xl glass-strong px-4 py-2 text-sm hover:bg-white/[0.06]"
          >
            Cancel
          </Link>
          <button
            type="button"
            disabled={busy || clips.length === 0 || !ytConnected}
            onClick={() => mut.mutate()}
            className="rounded-xl bg-white text-black px-4 py-2 text-sm font-medium hover:bg-white/90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Scheduling…
              </>
            ) : (
              <>
                <Trash2 className="w-0 h-0 hidden" />
                Create series & queue {clips.length || ""} posts
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
