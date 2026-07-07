import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  Wand2,
  Youtube,
  Zap,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { ProfileMenu } from "@/components/ProfileMenu";
import { supabase } from "@/integrations/supabase/client";
import {
  createScheduledPost,
  createSignedUploadUrl,
  getScheduledPost,
  saveDraftPost,
} from "@/lib/scheduler.functions";
import { listSocialAccounts } from "@/lib/social.functions";
import { getYouTubeUploadOptions } from "@/lib/youtube-upload-options.functions";
import {
  generateCaptionVariants,
  type CaptionVariant,
} from "@/lib/caption-studio.functions";
import {
  getBestPostingTimes,
  type BestTimesReport,
} from "@/lib/youtube-best-times.functions";

const searchSchema = z.object({ id: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/poster/new")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [{ title: "Schedule a post — Zentry Qor" }],
  }),
  component: NewScheduledPost,
});

function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return defaultWhen();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}


function defaultWhen() {
  const d = new Date(Date.now() + 15 * 60_000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Visibility = "public" | "unlisted" | "private";
type License = "youtube" | "creativeCommon";

function NewScheduledPost() {
  const nav = useNavigate();
  const { id: draftId } = Route.useSearch();
  const list = useServerFn(listSocialAccounts);
  const sign = useServerFn(createSignedUploadUrl);
  const create = useServerFn(createScheduledPost);
  const saveDraft = useServerFn(saveDraftPost);
  const getDraft = useServerFn(getScheduledPost);
  const ytOpts = useServerFn(getYouTubeUploadOptions);
  const genCaptions = useServerFn(generateCaptionVariants);
  const bestTimes = useServerFn(getBestPostingTimes);

  const accountsQuery = useQuery({
    queryKey: ["social-accounts"],
    queryFn: () => list(),
  });
  const connected = new Set(
    (accountsQuery.data ?? [])
      .filter((a) => !a.revoked_at)
      .map((a) => a.platform),
  );
  const ytConnected = connected.has("youtube");

  const optionsQuery = useQuery({
    queryKey: ["youtube-upload-options"],
    queryFn: () => ytOpts(),
    enabled: ytConnected,
    staleTime: 5 * 60_000,
  });

  const draftQuery = useQuery({
    queryKey: ["scheduled-post", draftId],
    queryFn: () => getDraft({ data: { id: draftId! } }),
    enabled: !!draftId,
    staleTime: 0,
  });

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [when, setWhen] = useState(defaultWhen());
  const [file, setFile] = useState<File | null>(null);
  const [existingVideoPath, setExistingVideoPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // YouTube options
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [madeForKids, setMadeForKids] = useState(false);
  const [categoryId, setCategoryId] = useState<string>("");
  const [tagsText, setTagsText] = useState("");
  const [license, setLicense] = useState<License>("youtube");
  const [embeddable, setEmbeddable] = useState(true);
  const [publicStats, setPublicStats] = useState(true);
  const [notifySubs, setNotifySubs] = useState(true);
  const [locationDesc, setLocationDesc] = useState("");
  const [playlistIds, setPlaylistIds] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [variants, setVariants] = useState<CaptionVariant[]>([]);
  const [pickedVariant, setPickedVariant] = useState<number | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const captionMut = useMutation({
    mutationFn: async () => {
      const topic =
        (title.trim() || caption.trim() || file?.name || existingVideoPath || "")
          .toString()
          .slice(0, 1500);
      if (!topic) throw new Error("Add a title, caption, or video first");
      return genCaptions({
        data: {
          topic,
          platform: "youtube_shorts",
          currentTitle: title || undefined,
          currentDescription: caption || undefined,
        },
      });
    },
    onSuccess: (r) => {
      setVariants(r.variants);
      setPickedVariant(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't generate captions"),
  });

  const heatmapQuery = useQuery({
    queryKey: ["yt-best-times"],
    queryFn: () =>
      bestTimes({
        data: { tzOffsetMinutes: -new Date().getTimezoneOffset() },
      }),
    enabled: ytConnected,
    staleTime: 10 * 60_000,
  });

  function applyVariant(v: CaptionVariant, idx: number) {
    setTitle(v.title.slice(0, 100));
    const tagLine = v.hashtags.join(" ");
    const desc = tagLine
      ? `${v.description.trim()}\n\n${tagLine}`
      : v.description.trim();
    setCaption(desc);
    // Also mirror hashtags into YT tags field.
    setTagsText(v.hashtags.map((h) => h.replace(/^#/, "")).join(", "));
    setPickedVariant(idx);
    toast.success(`${v.style} variant applied.`);
  }

  function scheduleAtPeak() {
    const rep = heatmapQuery.data;
    if (!rep || rep.top.length === 0) {
      toast.error("Not enough view history yet — post a few videos first.");
      return;
    }
    const now = new Date();
    // Try each top slot in order, pick the nearest upcoming date/time (>= now+15m).
    const min = new Date(now.getTime() + 15 * 60_000);
    let best: Date | null = null;
    for (const slot of rep.top) {
      for (let addDays = 0; addDays < 14; addDays++) {
        const d = new Date(now);
        d.setDate(now.getDate() + addDays);
        const daysDiff = (slot.weekday - d.getDay() + 7) % 7;
        d.setDate(d.getDate() + daysDiff);
        d.setHours(slot.hour, 0, 0, 0);
        if (d < min) continue;
        if (!best || d < best) best = d;
        break;
      }
    }
    if (!best) {
      toast.error("Couldn't find an upcoming peak slot");
      return;
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    setWhen(
      `${best.getFullYear()}-${pad(best.getMonth() + 1)}-${pad(best.getDate())}T${pad(best.getHours())}:${pad(best.getMinutes())}`,
    );
    toast.success(
      `Scheduled at your peak (${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][best.getDay()]} ${pad(best.getHours())}:00).`,
    );
  }

  useEffect(() => {
    if (!draftQuery.data || hydrated) return;
    const d = draftQuery.data;
    const yt = (d.options?.youtube ?? {}) as any;
    setCaption(d.caption ?? "");
    setWhen(toLocalInput(d.scheduled_for));
    setExistingVideoPath(d.video_path ?? null);
    if (yt.title) setTitle(String(yt.title).slice(0, 100));
    if (yt.privacyStatus) setVisibility(yt.privacyStatus);
    if (typeof yt.madeForKids === "boolean") setMadeForKids(yt.madeForKids);
    if (yt.categoryId) setCategoryId(String(yt.categoryId));
    if (Array.isArray(yt.tags)) setTagsText(yt.tags.join(", "));
    if (yt.license) setLicense(yt.license);
    if (typeof yt.embeddable === "boolean") setEmbeddable(yt.embeddable);
    if (typeof yt.publicStatsViewable === "boolean")
      setPublicStats(yt.publicStatsViewable);
    if (typeof yt.notifySubscribers === "boolean")
      setNotifySubs(yt.notifySubscribers);
    if (yt.locationDescription) setLocationDesc(yt.locationDescription);
    if (Array.isArray(yt.playlistIds)) setPlaylistIds(yt.playlistIds);
    setHydrated(true);
  }, [draftQuery.data, hydrated]);

  const tags = useMemo(
    () =>
      tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 50),
    [tagsText],
  );

  // Uploads the picked video (if any) and returns the storage path to persist.
  async function ensureVideoPath(): Promise<string | null> {
    if (!file) return existingVideoPath;
    setUploading(true);
    try {
      const signed = await sign({
        data: { filename: file.name, contentType: file.type || "video/mp4" },
      });
      const up = await supabase.storage
        .from("social-uploads")
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: file.type || "video/mp4",
          upsert: false,
        });
      if (up.error) throw new Error(up.error.message);
      return signed.path;
    } finally {
      setUploading(false);
    }
  }

  function ytPayload() {
    return {
      title: title.trim() || undefined,
      description: caption || undefined,
      privacyStatus: visibility,
      madeForKids,
      categoryId: categoryId || undefined,
      tags: tags.length > 0 ? tags : undefined,
      license,
      embeddable,
      publicStatsViewable: publicStats,
      notifySubscribers: notifySubs,
      locationDescription: locationDesc.trim() || undefined,
      playlistIds: playlistIds.length > 0 ? playlistIds : undefined,
    };
  }

  const mut = useMutation({
    mutationFn: async () => {
      if (!ytConnected)
        throw new Error("Connect YouTube on the Poster page first");
      const videoPath = await ensureVideoPath();
      if (!videoPath) throw new Error("Pick a video first");

      return create({
        data: {
          id: draftId,
          caption,
          videoPath,
          scheduledFor: new Date(when).toISOString(),
          platforms: ["youtube"],
          youtube: ytPayload(),
        },
      });
    },
    onSuccess: () => {
      toast.success("Scheduled! It'll publish automatically at the set time.");
      nav({ to: "/poster" });
    },
    onError: (e: any) => {
      setUploading(false);
      toast.error(e?.message ?? "Couldn't schedule post");
    },
  });

  const draftMut = useMutation({
    mutationFn: async () => {
      const videoPath = await ensureVideoPath();
      return saveDraft({
        data: {
          id: draftId,
          caption,
          videoPath: videoPath ?? undefined,
          scheduledFor: when ? new Date(when).toISOString() : undefined,
          platforms: ["youtube"],
          youtube: ytPayload(),
        },
      });
    },
    onSuccess: () => {
      toast.success("Draft saved.");
      nav({ to: "/poster" });
    },
    onError: (e: any) => {
      setUploading(false);
      toast.error(e?.message ?? "Couldn't save draft");
    },
  });

  const busy = mut.isPending || draftMut.isPending || uploading;
  const readyToSubmit = (!!file || !!existingVideoPath) && !!when && !busy;
  const canSaveDraft = !busy;

  const categories = optionsQuery.data?.categories ?? [];
  const playlists = optionsQuery.data?.playlists ?? [];


  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <AnimatedOrbs />
      <AppHeader right={<ProfileMenu />} />

      <main className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 pt-28 pb-40">
        <Link
          to="/poster"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Poster
        </Link>

        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl glass-strong flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {draftId ? "Edit draft" : "Schedule a post"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {draftId
                ? "Pick up where you left off. Save again as a draft, or schedule it."
                : "Upload a video, set details, and Zentry Qor will publish it to YouTube automatically."}
            </p>
          </div>
        </div>

        {draftId && draftQuery.isLoading && (
          <div className="glass-strong rounded-2xl p-4 mb-5 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading draft…
          </div>
        )}


        <form
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
          className="space-y-5"
        >
          {/* Video */}
          <div className="glass-strong rounded-2xl p-5">
            <label className="text-sm font-medium">Video file</label>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              MP4 recommended.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl border border-dashed border-white/15 p-6 hover:bg-white/[0.03] flex flex-col items-center justify-center gap-2 text-sm"
            >
              <Upload className="w-5 h-5 text-muted-foreground" />
              {file ? (
                <>
                  <span className="text-foreground truncate max-w-full">
                    {file.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(1)} MB · click to change
                  </span>
                </>
              ) : existingVideoPath ? (
                <>
                  <span className="text-foreground truncate max-w-full">
                    {existingVideoPath.split("/").pop()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Saved with your draft · click to replace
                  </span>
                </>
              ) : (
                <>
                  <span>Click to select a video</span>
                  <span className="text-xs text-muted-foreground">
                    Optional for drafts · required to schedule
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Title */}
          <div className="glass-strong rounded-2xl p-5">
            <label htmlFor="title" className="text-sm font-medium">
              Title
            </label>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Up to 100 characters. Leave blank to use the first line of the
              description.
            </p>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
              placeholder="POV: your first viral short"
              className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
            />
            <div className="text-[11px] text-muted-foreground mt-1 text-right">
              {title.length}/100
            </div>
          </div>

          {/* Description */}
          <div className="glass-strong rounded-2xl p-5">
            <label htmlFor="caption" className="text-sm font-medium">
              Description
            </label>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Shown under the video on YouTube.
            </p>
            <textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={5}
              placeholder={"Describe your short…\n\n#shorts"}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
            />
          </div>

          {/* AI Caption Studio */}
          <div className="glass-strong rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 mt-0.5 text-fuchsia-300" />
                <div>
                  <div className="text-sm font-medium">AI Caption Studio</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Generate 4 platform-tuned variants. Pick one to auto-fill
                    title, description, and hashtags.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => captionMut.mutate()}
                disabled={captionMut.isPending}
                className="rounded-xl bg-white text-black px-3 py-2 text-xs font-medium hover:bg-white/90 inline-flex items-center gap-1.5 shrink-0 disabled:opacity-60"
              >
                {captionMut.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" />
                )}
                {variants.length > 0 ? "Regenerate" : "Generate variants"}
              </button>
            </div>

            {variants.length === 0 && !captionMut.isPending && (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-muted-foreground">
                No variants yet. We'll use your title, description, or filename
                as the topic.
              </div>
            )}

            {variants.length > 0 && (
              <ul className="grid gap-2 sm:grid-cols-2">
                {variants.map((v, i) => (
                  <li
                    key={i}
                    className={
                      "rounded-xl border p-3 flex flex-col gap-2 " +
                      (pickedVariant === i
                        ? "border-white/50 bg-white/[0.06]"
                        : "border-white/10 hover:bg-white/[0.03]")
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] uppercase tracking-wider text-fuchsia-300">
                        {v.style}
                      </span>
                      {pickedVariant === i && (
                        <span className="text-[11px] rounded-full bg-emerald-500/15 text-emerald-300 px-2 py-0.5">
                          Applied
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium leading-snug line-clamp-2">
                      {v.title}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-pre-line line-clamp-4">
                      {v.description}
                    </div>
                    {v.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {v.hashtags.map((h) => (
                          <span
                            key={h}
                            className="text-[10px] rounded-full bg-white/10 px-1.5 py-0.5"
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => applyVariant(v, i)}
                      className="mt-auto rounded-lg bg-white/10 hover:bg-white/[0.18] px-3 py-1.5 text-xs font-medium"
                    >
                      Use this variant
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Publish time */}
          <div className="glass-strong rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <label htmlFor="when" className="text-sm font-medium">
                  Publish at
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Your local time. Runs within ~1 minute of the set time.
                </p>
              </div>
              <button
                type="button"
                onClick={scheduleAtPeak}
                disabled={heatmapQuery.isLoading}
                className="rounded-xl glass-strong border border-white/10 px-3 py-2 text-xs font-medium hover:bg-white/[0.06] inline-flex items-center gap-1.5 shrink-0 disabled:opacity-60"
                title="Uses your channel's view-weighted best times."
              >
                {heatmapQuery.isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                )}
                Schedule at peak
              </button>
            </div>
            <input
              id="when"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
            />
            {heatmapQuery.data && heatmapQuery.data.sampleSize > 0 && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowHeatmap((s) => !s)}
                  className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <ChevronDown
                    className={
                      "w-3 h-3 transition-transform " +
                      (showHeatmap ? "rotate-180" : "-rotate-90")
                    }
                  />
                  {showHeatmap ? "Hide" : "Show"} best-times heatmap ·{" "}
                  {heatmapQuery.data.sampleSize} videos analyzed
                </button>
                {showHeatmap && (
                  <BestTimesHeatmap report={heatmapQuery.data} />
                )}
              </div>
            )}
            {heatmapQuery.data && heatmapQuery.data.sampleSize === 0 && (
              <div className="mt-2 text-[11px] text-muted-foreground">
                Peak-time data will appear once your channel has a few videos
                with views.
              </div>
            )}
          </div>

          {/* Visibility */}
          <div className="glass-strong rounded-2xl p-5">
            <div className="text-sm font-medium mb-3">Visibility</div>
            <div className="grid grid-cols-3 gap-2">
              {(["public", "unlisted", "private"] as Visibility[]).map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setVisibility(v)}
                  className={
                    "rounded-xl border px-3 py-2 text-xs capitalize " +
                    (visibility === v
                      ? "border-white/40 bg-white/10"
                      : "border-white/10 hover:bg-white/[0.03]")
                  }
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Audience */}
          <div className="glass-strong rounded-2xl p-5">
            <div className="text-sm font-medium mb-1">Audience</div>
            <p className="text-xs text-muted-foreground mb-3">
              Required by YouTube (COPPA).
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMadeForKids(false)}
                className={
                  "rounded-xl border px-3 py-2 text-xs " +
                  (!madeForKids
                    ? "border-white/40 bg-white/10"
                    : "border-white/10 hover:bg-white/[0.03]")
                }
              >
                Not made for kids
              </button>
              <button
                type="button"
                onClick={() => setMadeForKids(true)}
                className={
                  "rounded-xl border px-3 py-2 text-xs " +
                  (madeForKids
                    ? "border-white/40 bg-white/10"
                    : "border-white/10 hover:bg-white/[0.03]")
                }
              >
                Made for kids
              </button>
            </div>
          </div>

          {/* Playlists (only if user has any) */}
          {playlists.length > 0 && (
            <div className="glass-strong rounded-2xl p-5">
              <div className="text-sm font-medium mb-1">Add to playlists</div>
              <p className="text-xs text-muted-foreground mb-3">
                Pick one or more of your channel's playlists.
              </p>
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {playlists.map((p) => {
                  const on = playlistIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/[0.03] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) =>
                          setPlaylistIds((prev) =>
                            e.target.checked
                              ? [...prev, p.id]
                              : prev.filter((x) => x !== p.id),
                          )
                        }
                        className="accent-white"
                      />
                      <span className="text-sm flex-1 truncate">{p.title}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {p.itemCount}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Advanced */}
          <div className="glass-strong rounded-2xl">
            <button
              type="button"
              onClick={() => setShowAdvanced((s) => !s)}
              className="w-full flex items-center justify-between p-5 text-sm font-medium"
            >
              <span>Advanced options</span>
              <ChevronDown
                className={
                  "w-4 h-4 transition-transform " +
                  (showAdvanced ? "rotate-180" : "")
                }
              />
            </button>
            {showAdvanced && (
              <div className="px-5 pb-5 space-y-5">
                {/* Category */}
                {categories.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                    >
                      <option value="">Default (People & Blogs)</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Tags */}
                <div>
                  <label className="text-sm font-medium">Tags</label>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">
                    Comma-separated. Up to 50.
                  </p>
                  <input
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                    placeholder="football, shorts, highlights"
                    className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                  />
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="text-[11px] rounded-full bg-white/10 px-2 py-0.5"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* License */}
                <div>
                  <label className="text-sm font-medium">License</label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLicense("youtube")}
                      className={
                        "rounded-xl border px-3 py-2 text-xs " +
                        (license === "youtube"
                          ? "border-white/40 bg-white/10"
                          : "border-white/10 hover:bg-white/[0.03]")
                      }
                    >
                      Standard YouTube
                    </button>
                    <button
                      type="button"
                      onClick={() => setLicense("creativeCommon")}
                      className={
                        "rounded-xl border px-3 py-2 text-xs " +
                        (license === "creativeCommon"
                          ? "border-white/40 bg-white/10"
                          : "border-white/10 hover:bg-white/[0.03]")
                      }
                    >
                      Creative Commons
                    </button>
                  </div>
                </div>

                {/* Toggles */}
                <Toggle
                  label="Allow embedding"
                  hint="Let other sites embed this video."
                  value={embeddable}
                  onChange={setEmbeddable}
                />
                <Toggle
                  label="Publish to subscriptions feed & notify subscribers"
                  hint="Turn off for silent uploads."
                  value={notifySubs}
                  onChange={setNotifySubs}
                />
                <Toggle
                  label="Show public stats on watch page"
                  hint="Likes, views, and ratings visible to viewers."
                  value={publicStats}
                  onChange={setPublicStats}
                />

                {/* Location */}
                <div>
                  <label className="text-sm font-medium">Location</label>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">
                    Optional location description.
                  </p>
                  <input
                    value={locationDesc}
                    onChange={(e) =>
                      setLocationDesc(e.target.value.slice(0, 120))
                    }
                    placeholder="London, UK"
                    className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Publish target */}
          <div className="glass-strong rounded-2xl p-5">
            <div className="text-sm font-medium mb-3">Publish to</div>
            <div className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <Youtube className="w-5 h-5 text-red-400" />
                <div>
                  <div className="text-sm font-medium">YouTube</div>
                  <div className="text-xs text-muted-foreground">
                    {ytConnected
                      ? "Connected — will auto-publish"
                      : "Not connected — connect on Poster page"}
                  </div>
                </div>
              </div>
              <span
                className={
                  "text-[11px] px-2 py-0.5 rounded-full " +
                  (ytConnected
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-amber-500/15 text-amber-300")
                }
              >
                {ytConnected ? "Ready" : "Connect required"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              TikTok & Instagram coming next.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 flex-wrap">
            <Link
              to="/poster"
              className="text-sm text-muted-foreground hover:text-foreground px-4 py-2"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => draftMut.mutate()}
              disabled={!canSaveDraft}
              className="rounded-xl glass-strong border border-white/10 px-4 py-2.5 text-sm font-medium hover:bg-white/[0.06] inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {draftMut.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              {draftMut.isPending
                ? "Saving…"
                : draftId
                  ? "Update draft"
                  : "Save as draft"}
            </button>
            <button
              type="submit"
              disabled={!readyToSubmit || !ytConnected}
              className="rounded-xl bg-white text-black px-5 py-2.5 text-sm font-medium hover:bg-white/90 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(mut.isPending || uploading) && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {uploading
                ? "Uploading video…"
                : mut.isPending
                  ? "Scheduling…"
                  : draftId
                    ? "Schedule now"
                    : "Schedule post"}
            </button>
          </div>

        </form>
      </main>
    </div>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <div className="text-sm">{label}</div>
        {hint && (
          <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={
          "relative w-10 h-6 rounded-full transition-colors shrink-0 " +
          (value ? "bg-white" : "bg-white/15")
        }
        aria-pressed={value}
      >
        <span
          className={
            "absolute top-0.5 w-5 h-5 rounded-full bg-black transition-transform " +
            (value ? "translate-x-4" : "translate-x-0.5")
          }
        />
      </button>
    </div>
  );
}

function BestTimesHeatmap({ report }: { report: BestTimesReport }) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hours = Array.from({ length: 24 }, (_, h) => h);
  const topKey = new Set(
    report.top.slice(0, 3).map((c) => `${c.weekday}-${c.hour}`),
  );
  return (
    <div className="mt-3 overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="grid grid-cols-[36px_repeat(24,minmax(14px,1fr))] gap-[2px] text-[9px] text-muted-foreground">
          <div />
          {hours.map((h) => (
            <div key={h} className="text-center">
              {h % 3 === 0 ? h : ""}
            </div>
          ))}
          {days.map((label, d) => (
            <>
              <div
                key={`l-${d}`}
                className="text-right pr-1 self-center text-muted-foreground"
              >
                {label}
              </div>
              {hours.map((h) => {
                const v = report.grid[d]?.[h] ?? 0;
                const isTop = topKey.has(`${d}-${h}`);
                return (
                  <div
                    key={`${d}-${h}`}
                    title={`${label} ${String(h).padStart(2, "0")}:00 · score ${(v * 100).toFixed(0)}%`}
                    className={
                      "h-4 rounded-sm " + (isTop ? "ring-1 ring-amber-300" : "")
                    }
                    style={{
                      background:
                        v > 0
                          ? `rgba(217, 70, 239, ${0.15 + v * 0.75})`
                          : "rgba(255,255,255,0.03)",
                    }}
                  />
                );
              })}
            </>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Lower</span>
          <div
            className="h-2 w-32 rounded-full"
            style={{
              background:
                "linear-gradient(to right, rgba(217,70,239,0.15), rgba(217,70,239,0.9))",
            }}
          />
          <span>Higher</span>
          <span className="ml-3">◇ Ring = top 3 slots</span>
        </div>
      </div>
    </div>
  );
}
