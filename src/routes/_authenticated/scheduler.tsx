import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calendar,
  CheckCircle2,
  Loader2,
  Plug,
  Youtube,
  Unlink,
  Clock,
  AlertTriangle,
  Copy,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { ProfileMenu } from "@/components/ProfileMenu";
import {
  disconnectSocialAccount,
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
import { Plus, Trash2, X as XIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/scheduler")({
  head: () => ({
    meta: [
      { title: "Scheduler — Zentry Qor" },
      {
        name: "description",
        content:
          "Queue posts to TikTok, Instagram Reels, and YouTube Shorts from one workspace.",
      },
    ],
  }),
  component: SchedulerPage,
});

type Platform = "youtube";

const PLATFORMS: {
  key: Platform;
  label: string;
  icon: typeof Youtube;
  blurb: string;
  color: string;
}[] = [
  {
    key: "youtube",
    label: "YouTube",
    icon: Youtube,
    blurb: "Auto-publish videos straight to your channel.",
    color: "text-red-400",
  },
];

function SchedulerPage() {
  const qc = useQueryClient();
  const list = useServerFn(listSocialAccounts);
  const start = useServerFn(startSocialOAuth);
  const disconnect = useServerFn(disconnectSocialAccount);
  const listPosts = useServerFn(listScheduledPosts);
  const cancelPost = useServerFn(cancelScheduledPost);
  const delPost = useServerFn(deleteScheduledPost);

  const accountsQuery = useQuery({
    queryKey: ["social-accounts"],
    queryFn: () => list(),
  });

  const postsQuery = useQuery({
    queryKey: ["scheduled-posts"],
    queryFn: () => listPosts(),
    refetchInterval: 15_000,
  });

  const startMut = useMutation({
    mutationFn: async (platform: Platform) => start({ data: { platform } }),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't start connection"),
  });

  const disconnectMut = useMutation({
    mutationFn: async (id: string) => disconnect({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social-accounts"] });
      toast.success("Disconnected");
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't disconnect"),
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

  const active = (accountsQuery.data ?? []).filter(
    (a: SocialAccountRow) => !a.revoked_at,
  );
  const byPlatform = new Map<Platform, SocialAccountRow>();
  for (const a of active) byPlatform.set(a.platform, a);

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
              Native scheduler
            </h1>
            <p className="text-muted-foreground mt-1 max-w-xl">
              Connect your accounts, queue posts, and let Zentry Qor publish to TikTok,
              Instagram Reels, and YouTube Shorts on your schedule.
            </p>
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-5 mb-8 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-amber-400" />
          <div className="text-sm text-muted-foreground">
            <span className="text-foreground font-medium">Sandbox mode.</span>{" "}
            Each platform requires app review before it can post to real accounts at scale.
            You can connect and test with sandbox/test users today; automated posting for
            all users unlocks once each provider approves the app.
          </div>
        </div>

        <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Connected accounts
        </h2>

        <div className="space-y-3 mb-10">
          {PLATFORMS.map((p) => {
            const acct = byPlatform.get(p.key);
            const Icon = p.icon;
            const expired =
              acct?.expires_at && new Date(acct.expires_at).getTime() < Date.now();
            return (
              <div
                key={p.key}
                className="glass-strong rounded-2xl p-5 flex items-start gap-4"
              >
                <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 ${p.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-medium">{p.label}</div>
                    {acct && !expired && (
                      <span className="inline-flex items-center gap-1 text-[11px] rounded-full bg-emerald-500/15 text-emerald-300 px-2 py-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Connected
                      </span>
                    )}
                    {expired && (
                      <span className="inline-flex items-center gap-1 text-[11px] rounded-full bg-amber-500/15 text-amber-300 px-2 py-0.5">
                        <Clock className="w-3 h-3" /> Token expired
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {acct ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {acct.meta?.thumbnail && (
                            <img
                              src={acct.meta.thumbnail}
                              alt=""
                              className="w-5 h-5 rounded-full"
                            />
                          )}
                          <span className="text-foreground/90 font-medium">
                            {acct.meta?.channel_title ?? acct.handle ?? "Connected"}
                          </span>
                          {acct.handle && acct.meta?.channel_title && acct.handle !== acct.meta.channel_title && (
                            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                              @{acct.handle.replace(/^@/, "")}
                              <button
                                onClick={() => {
                                  const handle = acct.handle!.replace(/^@/, "");
                                  navigator.clipboard.writeText(handle).then(() => toast.success("Handle copied"));
                                }}
                                className="hover:text-foreground/80 p-0.5 rounded"
                                aria-label="Copy handle"
                                title="Copy handle"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </span>
                          )}
                        </div>
                        {acct.meta?.channel_id && (
                          <div className="text-[11px] font-mono text-muted-foreground/80 break-all inline-flex items-center gap-1 flex-wrap">
                            Channel ID: {acct.meta.channel_id}
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(acct.meta!.channel_id!).then(() => toast.success("Channel ID copied"));
                              }}
                              className="hover:text-foreground/80 p-0.5 rounded"
                              aria-label="Copy channel ID"
                              title="Copy channel ID"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        {acct.expires_at && (
                          <div className="text-[11px]">
                            Token expires {new Date(acct.expires_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      p.blurb
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  {acct ? (
                    <>
                      <button
                        onClick={() => startMut.mutate(p.key)}
                        disabled={startMut.isPending}
                        className="rounded-xl glass-strong px-3 py-2 text-xs hover:bg-white/[0.06] inline-flex items-center gap-1.5"
                      >
                        {startMut.isPending && startMut.variables === p.key ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plug className="w-3.5 h-3.5" />
                        )}
                        Reconnect
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Disconnect ${p.label}?`)) disconnectMut.mutate(acct.id);
                        }}
                        disabled={disconnectMut.isPending}
                        className="rounded-xl px-3 py-2 text-xs text-muted-foreground hover:text-red-400 inline-flex items-center gap-1.5"
                      >
                        <Unlink className="w-3.5 h-3.5" /> Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startMut.mutate(p.key)}
                      disabled={startMut.isPending}
                      className="rounded-xl bg-white text-black px-4 py-2 text-xs font-medium hover:bg-white/90 inline-flex items-center gap-1.5"
                    >
                      {startMut.isPending && startMut.variables === p.key ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plug className="w-3.5 h-3.5" />
                      )}
                      Connect
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
            Scheduled posts
          </h2>
          <Link
            to="/scheduler/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white text-black px-3 py-1.5 text-xs font-medium hover:bg-white/90"
          >
            <Plus className="w-3.5 h-3.5" /> New post
          </Link>
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
              <Link to="/scheduler/new" className="text-foreground underline">
                Schedule your first one
              </Link>
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
