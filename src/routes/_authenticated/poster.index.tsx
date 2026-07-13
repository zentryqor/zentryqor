import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  Loader2,
  Plug,
  Youtube,
  Clock,
  AlertTriangle,
  Layers,
  Trash2,
  X as XIcon,
  ChevronRight,
} from "lucide-react";
import { WorkspaceShell, SectionLabel } from "@/components/WorkspaceShell";
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

export const Route = createFileRoute("/_authenticated/poster/")({
  head: () => ({
    meta: [
      { title: "Poster — Zentry Qor" },
      { name: "description", content: "Queue posts to YouTube, TikTok and Instagram Reels from one workspace." },
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

  const accountsQuery = useQuery({ queryKey: ["social-accounts"], queryFn: () => list() });
  const postsQuery = useQuery({ queryKey: ["scheduled-posts"], queryFn: () => listPosts(), refetchInterval: 15_000 });
  const seriesQuery = useQuery({ queryKey: ["post-series"], queryFn: () => listSeries(), refetchInterval: 30_000 });

  const startMut = useMutation({
    mutationFn: async (platform: Platform) => start({ data: { platform, origin: window.location.origin } }),
    onSuccess: (res) => { window.location.href = res.url; },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't start connection"),
  });

  const cancelMut = useMutation({
    mutationFn: async (id: string) => cancelPost({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["scheduled-posts"] }); toast.success("Canceled"); },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't cancel"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => delPost({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["scheduled-posts"] }); toast.success("Deleted"); },
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

  const active = (accountsQuery.data ?? []).filter((a: SocialAccountRow) => !a.revoked_at);
  const ytAccounts = active.filter((a) => a.platform === "youtube");

  return (
    <WorkspaceShell path={["poster"]}>
      <div className="mb-8">
        <div className="text-[11px] font-mono-display text-muted-foreground">
          &gt; schedule --queue
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-mono-display tracking-tight">
          native poster
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
          Connect accounts, queue posts, drip series to YouTube, TikTok and Reels.
        </p>
      </div>

      {/* Sandbox notice */}
      <div className="terminal-panel rounded-md p-4 mb-8 flex items-start gap-3 border-amber-500/30">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" strokeWidth={1.75} />
        <div className="text-xs font-mono-display text-muted-foreground leading-relaxed">
          <span className="text-amber-300">[sandbox]</span> Each platform requires app review before it can post at scale. Connect and test today; auto-posting for all users unlocks on approval.
        </div>
      </div>

      {/* Accounts */}
      <SectionLabel
        right={
          ytAccounts.length > 0 && (
            <button
              onClick={() => startMut.mutate("youtube")}
              disabled={startMut.isPending}
              className="text-[11px] font-mono-display text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              {startMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plug className="w-3 h-3" />}
              add channel
            </button>
          )
        }
      >
        connected accounts
      </SectionLabel>
      <div className="terminal-panel rounded-md mb-10">
        {ytAccounts.length === 0 ? (
          <div className="p-4 flex items-center gap-4">
            <div className="w-8 h-8 rounded-sm terminal-panel-inset flex items-center justify-center shrink-0 text-red-400">
              <Youtube className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-mono-display">youtube</div>
              <div className="text-[11px] text-muted-foreground">not connected · auto-publish to your channel</div>
            </div>
            <button
              onClick={() => startMut.mutate("youtube")}
              disabled={startMut.isPending}
              className="h-8 px-3 rounded-sm bg-accent text-accent-foreground text-[11px] font-mono-display font-medium flex items-center gap-1.5 shrink-0"
            >
              {startMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2} /> : <Plug className="w-3 h-3" strokeWidth={2} />}
              connect
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {ytAccounts.map((yt) => {
              const ytExpired = yt.expires_at && new Date(yt.expires_at).getTime() < Date.now();
              return (
                <li key={yt.id}>
                  <Link
                    to="/poster/youtube"
                    search={{ accountId: yt.id }}
                    className="flex items-center gap-4 p-4 hover:bg-elevated/30 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-sm terminal-panel-inset flex items-center justify-center shrink-0 text-red-400">
                      <Youtube className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {yt.meta?.thumbnail && (
                          <img src={yt.meta.thumbnail} alt="" className="w-4 h-4 rounded-full shrink-0" />
                        )}
                        <span className="text-sm truncate">
                          {yt.meta?.channel_title ?? yt.handle ?? "connected"}
                        </span>
                        {!ytExpired ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono-display text-success">
                            <CheckCircle2 className="w-2.5 h-2.5" strokeWidth={2} /> ok
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono-display text-amber-300">
                            <Clock className="w-2.5 h-2.5" strokeWidth={2} /> expired
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono-display mt-0.5">
                        youtube · channel & analytics
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0" strokeWidth={1.75} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Series */}
      <SectionLabel right={seriesQuery.data && `[${seriesQuery.data.length}]`}>series</SectionLabel>
      <div className="terminal-panel rounded-md mb-10">
        {seriesQuery.isLoading ? (
          <div className="p-4 text-xs font-mono-display text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" /> loading…
          </div>
        ) : (seriesQuery.data ?? []).length === 0 ? (
          <div className="p-6 text-center text-xs font-mono-display text-muted-foreground">
            no series · upload a batch of clips and drip-post them
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {(seriesQuery.data ?? []).map((s: PostSeriesRow) => {
              const cad = s.cadence ?? {};
              const label =
                cad.type === "daily" ? "daily" :
                cad.type === "weekdays" ? "mon-fri" :
                cad.type === "every_n_days" ? `every ${cad.intervalDays ?? 1}d` : "custom";
              const pct = s.counts.total ? (s.counts.published / s.counts.total) * 100 : 0;
              return (
                <li key={s.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-sm terminal-panel-inset flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4 text-accent" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{s.name}</div>
                      <div className="text-[11px] font-mono-display text-muted-foreground mt-0.5 tabular-nums">
                        {label} @ {cad.timeOfDay ?? "—"} · {s.counts.published}/{s.counts.total} pub
                        {s.counts.failed > 0 && <span className="text-destructive"> · {s.counts.failed} fail</span>}
                      </div>
                      {s.nextRun && (
                        <div className="text-[10px] font-mono-display text-muted-foreground mt-0.5">
                          next: {new Date(s.nextRun).toLocaleString()}
                        </div>
                      )}
                      <div className="mt-2 h-1 rounded-full bg-elevated/60 overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <button
                      onClick={() => { if (confirm("Delete series? Queued posts will be canceled.")) delSeriesMut.mutate(s.id); }}
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded-sm shrink-0"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Scheduled posts */}
      <SectionLabel right={postsQuery.data && `[${postsQuery.data.length}]`}>scheduled</SectionLabel>
      <div className="terminal-panel rounded-md mb-10">
        {postsQuery.isLoading ? (
          <div className="p-4 text-xs font-mono-display text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" /> loading…
          </div>
        ) : (postsQuery.data ?? []).length === 0 ? (
          <div className="p-6 text-center text-xs font-mono-display text-muted-foreground">
            no scheduled posts ·{" "}
            {ytAccounts.length > 0 ? (
              <Link to="/poster/youtube" search={{ accountId: ytAccounts[0].id }} className="text-accent underline">
                open channel to schedule
              </Link>
            ) : (
              <span>connect youtube above</span>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {(postsQuery.data ?? []).map((p: ScheduledPostRow) => {
              const when = new Date(p.scheduled_for);
              const statusColor: Record<string, string> = {
                queued: "text-sky-300", publishing: "text-amber-300",
                published: "text-success", failed: "text-destructive",
                canceled: "text-muted-foreground", draft: "text-muted-foreground",
              };
              const first = (p.caption ?? "").split("\n")[0].trim() || "Untitled";
              return (
                <li key={p.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-mono-display uppercase tracking-wider ${statusColor[p.status] ?? "text-muted-foreground"}`}>
                          [{p.status}]
                        </span>
                        <span className="text-sm truncate">{first}</span>
                      </div>
                      <div className="text-[11px] font-mono-display text-muted-foreground mt-1 tabular-nums">
                        {when.toLocaleString()} · {p.targets.length} target{p.targets.length === 1 ? "" : "s"}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {p.targets.map((t) => (
                          <span
                            key={t.id}
                            className={`text-[10px] font-mono-display px-1.5 py-0.5 rounded-sm terminal-panel-inset ${statusColor[t.status] ?? ""}`}
                            title={t.error ?? ""}
                          >
                            {t.platform}:{t.status}
                            {t.platform_post_id && t.platform === "youtube" && (
                              <> · <a href={`https://youtu.be/${t.platform_post_id}`} target="_blank" rel="noreferrer" className="underline">view</a></>
                            )}
                          </span>
                        ))}
                      </div>
                      {p.error && <div className="text-[11px] font-mono-display text-destructive mt-2">{p.error}</div>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {p.status === "draft" && (
                        <Link
                          to="/poster/new"
                          search={{ id: p.id }}
                          className="px-2 py-1 rounded-sm terminal-panel-inset text-[11px] font-mono-display hover:bg-elevated/50"
                        >
                          edit
                        </Link>
                      )}
                      {(p.status === "queued" || p.status === "draft") && (
                        <button
                          onClick={() => cancelMut.mutate(p.id)}
                          className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-elevated/50"
                          title="Cancel"
                        >
                          <XIcon className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>
                      )}
                      <button
                        onClick={() => { if (confirm("Delete this scheduled post?")) deleteMut.mutate(p.id); }}
                        className="p-1.5 rounded-sm text-muted-foreground hover:text-destructive hover:bg-elevated/50"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Roadmap */}
      <div className="terminal-panel rounded-md p-5">
        <div className="text-[10px] font-mono-display uppercase tracking-[0.22em] text-accent mb-2">
          # roadmap
        </div>
        <div className="text-sm">YouTube live · TikTok + IG Reels pending app review.</div>
        <Link
          to="/roadmap"
          className="mt-3 inline-flex h-8 px-3 rounded-sm terminal-panel-inset text-[11px] font-mono-display hover:bg-elevated/50 items-center gap-1"
        >
          see roadmap →
        </Link>
      </div>
    </WorkspaceShell>
  );
}
