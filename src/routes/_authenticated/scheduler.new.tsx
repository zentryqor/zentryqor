import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  Upload,
  Youtube,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { ProfileMenu } from "@/components/ProfileMenu";
import { supabase } from "@/integrations/supabase/client";
import {
  createScheduledPost,
  createSignedUploadUrl,
} from "@/lib/scheduler.functions";
import { listSocialAccounts } from "@/lib/social.functions";

export const Route = createFileRoute("/_authenticated/scheduler/new")({
  head: () => ({
    meta: [{ title: "Schedule a post — Zentry Qor" }],
  }),
  component: NewScheduledPost,
});

function defaultWhen() {
  const d = new Date(Date.now() + 15 * 60_000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function NewScheduledPost() {
  const nav = useNavigate();
  const list = useServerFn(listSocialAccounts);
  const sign = useServerFn(createSignedUploadUrl);
  const create = useServerFn(createScheduledPost);

  const accountsQuery = useQuery({
    queryKey: ["social-accounts"],
    queryFn: () => list(),
  });
  const connected = new Set(
    (accountsQuery.data ?? [])
      .filter((a) => !a.revoked_at)
      .map((a) => a.platform),
  );

  const [caption, setCaption] = useState("");
  const [when, setWhen] = useState(defaultWhen());
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const mut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Pick a video first");
      if (!connected.has("youtube"))
        throw new Error("Connect YouTube on the scheduler page first");

      setUploading(true);
      const signed = await sign({
        data: { filename: file.name, contentType: file.type || "video/mp4" },
      });
      // Upload the file to Supabase Storage using the signed upload URL
      const up = await supabase.storage
        .from("social-uploads")
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: file.type || "video/mp4",
          upsert: false,
        });
      setUploading(false);
      if (up.error) throw new Error(up.error.message);

      return create({
        data: {
          caption,
          videoPath: signed.path,
          scheduledFor: new Date(when).toISOString(),
          platforms: ["youtube"],
        },
      });
    },
    onSuccess: () => {
      toast.success("Scheduled! It'll publish automatically at the set time.");
      nav({ to: "/scheduler" });
    },
    onError: (e: any) => {
      setUploading(false);
      toast.error(e?.message ?? "Couldn't schedule post");
    },
  });

  const readyToSubmit =
    !!file && !!when && !mut.isPending && !uploading;

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <AnimatedOrbs />
      <AppHeader right={<ProfileMenu />} />

      <main className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 pt-28 pb-40">
        <Link
          to="/scheduler"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to scheduler
        </Link>

        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl glass-strong flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Schedule a post
            </h1>
            <p className="text-muted-foreground mt-1">
              Upload a video, pick a time, and Zentry Qor will publish it to
              YouTube automatically.
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
          className="space-y-5"
        >
          <div className="glass-strong rounded-2xl p-5">
            <label className="text-sm font-medium">Video file</label>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              MP4 recommended. Vertical 9:16 up to 60s = YouTube Shorts.
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
              ) : (
                <>
                  <span>Click to select a video</span>
                  <span className="text-xs text-muted-foreground">
                    Stored privately in your workspace
                  </span>
                </>
              )}
            </button>
          </div>

          <div className="glass-strong rounded-2xl p-5">
            <label htmlFor="caption" className="text-sm font-medium">
              Caption / description
            </label>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              First line becomes the YouTube title. Rest becomes description.
            </p>
            <textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={5}
              placeholder={"POV: your first viral short\n\n#shorts"}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
            />
          </div>

          <div className="glass-strong rounded-2xl p-5">
            <label htmlFor="when" className="text-sm font-medium">
              Publish at
            </label>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Your local time. Runs within ~1 minute of the set time.
            </p>
            <input
              id="when"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
            />
          </div>

          <div className="glass-strong rounded-2xl p-5">
            <div className="text-sm font-medium mb-3">Publish to</div>
            <div className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <Youtube className="w-5 h-5 text-red-400" />
                <div>
                  <div className="text-sm font-medium">YouTube</div>
                  <div className="text-xs text-muted-foreground">
                    {connected.has("youtube")
                      ? "Connected — will auto-publish"
                      : "Not connected — connect on scheduler page"}
                  </div>
                </div>
              </div>
              <span
                className={
                  "text-[11px] px-2 py-0.5 rounded-full " +
                  (connected.has("youtube")
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-amber-500/15 text-amber-300")
                }
              >
                {connected.has("youtube") ? "Ready" : "Connect required"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              TikTok & Instagram coming next.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Link
              to="/scheduler"
              className="text-sm text-muted-foreground hover:text-foreground px-4 py-2"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!readyToSubmit || !connected.has("youtube")}
              className="rounded-xl bg-white text-black px-5 py-2.5 text-sm font-medium hover:bg-white/90 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(mut.isPending || uploading) && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {uploading
                ? "Uploading video…"
                : mut.isPending
                  ? "Scheduling…"
                  : "Schedule post"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
