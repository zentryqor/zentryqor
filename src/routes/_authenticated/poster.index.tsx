import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Plug,
  Youtube,
  Clock,
  AlertTriangle,
  Layers,
  Plus,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { ProfileMenu } from "@/components/ProfileMenu";
import {
  listSocialAccounts,
  startSocialOAuth,
  type SocialAccountRow,
} from "@/lib/social.functions";
import {
  cancelScheduledPost,
  deleteScheduledPost,
  listScheduledPosts,
  type ScheduledPostRow,
} from "@/lib/scheduler.functions";
import {
  listPostSeries,
  deletePostSeries,
  type PostSeriesRow,
} from "@/lib/post-series.functions";
import { Trash2, X as XIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/poster/")({
  head: () => ({
    meta: [
      { title: "Poster — Zentry Qor" },
      {
        name: "description",
        content:
          "Queue posts to TikTok, Instagram Reels, and YouTube Shorts from one workspace.",
      },
    ],
  }),
  component: PosterPage,
});

type Platform = "youtube";

function PosterPage() {
  const qc = useQueryClient();
  const list = useServerFn(listSocialAccounts);
  const start = useServerFn(startSocialOAuth);
  const listPosts = useServerFn(listScheduledPosts);
  const cancelPost = useServerFn(cancelScheduledPost);
  const delPost = useServerFn(deleteScheduledPost);
  const listSeries = useServerFn(listPostSeries);
  const delSeries = useServerFn(deletePostSeries);

  const accountsQuery = useQuery({
    queryKey: ["social-accounts"],
    queryFn: () => list(),
  });

  const postsQuery = useQuery({
    queryKey: ["scheduled-posts"],
    queryFn: () => listPosts(),
    refetchInterval: 15_000,
  });

  const seriesQuery = useQuery({
    queryKey: ["post-series"],
    queryFn: () => listSeries(),
    refetchInterval: 30_000,
  });

  const startMut = useMutation({
    mutationFn: async (platform: Platform) =>
      start({ data: { platform, origin: window.location.origin } }),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't start connection"),
  });

  const cancelMut = useMutation({
    mutationFn: async (id: string) => cancelPost({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduled-posts"] });
      toast.success("Canceled");
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't cancel"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => delPost({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduled-posts"] });
      toast.success("Deleted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't delete"),
  });

  const delSeriesMut = useMutation({
    mutationFn: async (id: string) => delSeries({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post-series"] });
      qc.invalidateQueries({ queryKey: ["scheduled-posts"] });
      toast.success("Series deleted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't delete series"),
  });

  const active = (accountsQuery.data ?? []).filter(
    (a: SocialAccountRow) => !a.revoked_at,
  );
  const ytAccounts = active.filter((a) => a.platform === "youtube");

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <AnimatedOrbs />
      <AppHeader right={<ProfileMenu />} />

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-40">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl glass-strong flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Native Poster
            </h1>
            <p className="text-muted-foreground mt-1 max-w-xl">
              Connect your accounts, queue posts, and let Zentry Qor publish to
              TikTok, Instagram Reels, and YouTube Shorts on your schedule.
            </p>
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-5 mb-8 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-amber-400" />
          <div className="text-sm text-muted-foreground">
            <span className="text-foreground font-medium">Sandbox mode.</span>{" "}
            Each platform requires app review before it can post to real
            accounts at scale. You can connect and test with sandbox/test users
            today; automated posting for all users unlocks once each provider
            approves the app.
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
            Connected accounts
          </h2>
          {ytAccounts.length > 0 && (
            <button
              onClick={() => startMut.mutate("youtube")}
              disabled={startMut.isPending}
              className="rounded-xl glass-strong px-3 py-1.5 text-xs font-medium hover:bg-white/[0.06] inline-flex items-center gap-1.5"
            >
              {startMut.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plug className="w-3.5 h-3.5" />
              )}
              Add YouTube channel
            </button>
          )}
        </div>

        <div className="space-y-3 mb-10">
          {ytAccounts.length === 0 ? (
            <div className="glass-strong rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 text-red-400">
                <Youtube className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">YouTube</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Auto-publish videos straight to your channel.
                </div>
              </div>
              <button
                onClick={() => startMut.mutate("youtube")}
                disabled={startMut.isPending}
                className="rounded-xl bg-white text-black px-4 py-2 text-xs font-medium hover:bg-white/90 inline-flex items-center gap-1.5 shrink-0"
              >
                {startMut.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plug className="w-3.5 h-3.5" />
                )}
                Connect
              </button>
            </div>
          ) : (
            ytAccounts.map((yt) => {
              const ytExpired =
                yt.expires_at && new Date(yt.expires_at).getTime() < Date.now();
              return (
                <Link
                  key={yt.id}
                  to="/poster/youtube"
                  search={{ accountId: yt.id }}
                  className="glass-strong rounded-2xl p-5 flex items-center gap-4 group hover:bg-white/[0.04] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 text-red-400">
                    <Youtube className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium">YouTube</div>
                      {!ytExpired ? (
                        <span className="inline-flex items-center gap-1 text-[11px] rounded-full bg-emerald-500/15 text-emerald-300 px-2 py-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] rounded-full bg-amber-500/15 text-amber-300 px-2 py-0.5">
                          <Clock className="w-3 h-3" /> Token expired
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2 min-w-0">
                      {yt.meta?.thumbnail && (
                        <img
                          src={yt.meta.thumbnail}
                          alt=""
                          className="w-5 h-5 rounded-full shrink-0"
                        />
                      )}
                      <span className="text-foreground/90 font-medium truncate">
                        {yt.meta?.channel_title ?? yt.handle ?? "Connected"}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        · View channel & analytics
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground shrink-0" />
                </Link>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
            Series
          </h2>
        </div>

        <div className="space-y-3 mb-10">
          {seriesQuery.isLoading && (
            <div className="glass-strong rounded-2xl p-5 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          )}
          {seriesQuery.data && seriesQuery.data.length === 0 && (
            <div className="glass-strong rounded-2xl p-6 text-sm text-muted-foreground text-center">
              No series yet. Upload a batch of clips and drip-post them on any
              cadence.
            </div>
          )}
          {(seriesQuery.data ?? []).map((s: PostSeriesRow) => {
            const cad = s.cadence ?? {};
            const label =
              cad.type === "daily"
                ? "Daily"
                : cad.type === "weekdays"
                  ? "Mon–Fri"
                  : cad.type === "every_n_days"
                    ? `Every ${cad.intervalDays ?? 1} days`
                    : "Custom days";
            return (
              <div key={s.id} className="glass-strong rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {label} at {cad.timeOfDay ?? "—"} · {s.counts.published}/
                      {s.counts.total} published
                      {s.counts.failed > 0 && (
                        <span className="text-red-300">
                          {" "}
                          · {s.counts.failed} failed
                        </span>
                      )}
                    </div>
                    {s.nextRun && (
                      <div className="text-[11px] text-muted-foreground mt-1">
                        Next: {new Date(s.nextRun).toLocaleString()}
                      </div>
                    )}
                    <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full bg-white/70"
                        style={{
                          width: `${s.counts.total ? (s.counts.published / s.counts.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          "Delete this series? Queued posts in it will be canceled.",
                        )
                      )
                        delSeriesMut.mutate(s.id);
                    }}
                    className="rounded-lg p-2 text-muted-foreground hover:text-red-400 hover:bg-white/[0.06] shrink-0"
                    title="Delete series"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
            Scheduled posts
          </h2>
        </div>


        <div className="space-y-3 mb-10">
          {postsQuery.isLoading && (
            <div className="glass-strong rounded-2xl p-5 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          )}
          {postsQuery.data && postsQuery.data.length === 0 && (
            <div className="glass-strong rounded-2xl p-6 text-sm text-muted-foreground text-center">
              No scheduled posts yet.{" "}
              {ytAccounts.length > 0 ? (
                <Link
                  to="/poster/youtube"
                  search={{ accountId: ytAccounts[0].id }}
                  className="text-foreground underline"
                >
                  Open your channel to schedule one
                </Link>
              ) : (
                <span>Connect YouTube above to get started</span>
              )}
              .
            </div>
          )}
          {(postsQuery.data ?? []).map((p: ScheduledPostRow) => {
            const when = new Date(p.scheduled_for);
            const statusColor: Record<string, string> = {
              queued: "bg-sky-500/15 text-sky-300",
              publishing: "bg-amber-500/15 text-amber-300",
              published: "bg-emerald-500/15 text-emerald-300",
              failed: "bg-red-500/15 text-red-300",
              canceled: "bg-white/10 text-muted-foreground",
              draft: "bg-white/10 text-muted-foreground",
            };
            const first = (p.caption ?? "").split("\n")[0].trim() || "Untitled";
            return (
              <div key={p.id} className="glass-strong rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium truncate">{first}</div>
                      <span
                        className={`text-[11px] rounded-full px-2 py-0.5 ${statusColor[p.status] ?? "bg-white/10"}`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {when.toLocaleString()} · {p.targets.length} target
                      {p.targets.length === 1 ? "" : "s"}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {p.targets.map((t) => (
                        <span
                          key={t.id}
                          className={`text-[11px] rounded-full px-2 py-0.5 ${statusColor[t.status] ?? "bg-white/10 text-muted-foreground"}`}
                          title={t.error ?? ""}
                        >
                          {t.platform}: {t.status}
                          {t.platform_post_id && t.platform === "youtube" && (
                            <>
                              {" · "}
                              <a
                                href={`https://youtu.be/${t.platform_post_id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="underline"
                              >
                                view
                              </a>
                            </>
                          )}
                        </span>
                      ))}
                    </div>
                    {p.error && (
                      <div className="text-[11px] text-red-300 mt-2">
                        {p.error}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {p.status === "draft" && (
                      <Link
                        to="/poster/new"
                        search={{ id: p.id }}
                        className="rounded-lg px-2.5 py-1.5 text-xs bg-white/10 hover:bg-white/[0.15]"
                        title="Edit draft"
                      >
                        Edit
                      </Link>
                    )}
                    {(p.status === "queued" || p.status === "draft") && (
                      <button
                        onClick={() => cancelMut.mutate(p.id)}
                        className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
                        title="Cancel"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm("Delete this scheduled post?"))
                          deleteMut.mutate(p.id);
                      }}
                      className="rounded-lg p-2 text-muted-foreground hover:text-red-400 hover:bg-white/[0.06]"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>

        <div className="glass-strong rounded-2xl p-6">
          <h2 className="font-medium mb-2">What's next</h2>
          <p className="text-sm text-muted-foreground mb-4">
            YouTube auto-publish is live. TikTok and Instagram Reels unlock once
            each platform's app review clears.
          </p>
          <Link
            to="/roadmap"
            className="inline-flex items-center gap-2 rounded-xl glass-strong px-4 py-2 text-sm hover:bg-white/[0.06]"
          >
            See the roadmap
          </Link>
        </div>
      </main>
    </div>
  );
}
