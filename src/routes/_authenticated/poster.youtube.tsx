import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  BarChart3,
  Copy,
  ExternalLink,
  Eye,
  Film,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  ThumbsUp,
  Unlink,
  Users,
  Youtube,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { ProfileMenu } from "@/components/ProfileMenu";
import { getYouTubeChannelDetails } from "@/lib/youtube-analytics.functions";
import {
  disconnectSocialAccount,
  listSocialAccounts,
  startSocialOAuth,
} from "@/lib/social.functions";

export const Route = createFileRoute("/_authenticated/poster/youtube")({
  validateSearch: (search: Record<string, unknown>) => ({
    accountId:
      typeof search.accountId === "string" ? search.accountId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "YouTube channel — Zentry Qor" },
      {
        name: "description",
        content: "Your connected YouTube channel and its analytics.",
      },
    ],
  }),
  component: YouTubeChannelPage,
});

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "K";
  return n.toLocaleString();
}

function parseIsoDuration(iso: string | null): string {
  if (!iso) return "";
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "";
  const h = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  const s = Number(m[3] ?? 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(min)}:${pad(s)}` : `${min}:${pad(s)}`;
}

function YouTubeChannelPage() {
  const qc = useQueryClient();
  const { accountId } = Route.useSearch();
  const fetchDetails = useServerFn(getYouTubeChannelDetails);
  const listAccounts = useServerFn(listSocialAccounts);
  const start = useServerFn(startSocialOAuth);
  const disconnect = useServerFn(disconnectSocialAccount);

  const detailsQuery = useQuery({
    queryKey: ["youtube-channel-details", accountId ?? "latest"],
    queryFn: () => fetchDetails({ data: { accountId } }),
    retry: 1,
  });

  const accountsQuery = useQuery({
    queryKey: ["social-accounts"],
    queryFn: () => listAccounts(),
  });
  const ytAccounts = (accountsQuery.data ?? []).filter(
    (a) => a.platform === "youtube" && !a.revoked_at,
  );
  const ytAccount =
    (accountId && ytAccounts.find((a) => a.id === accountId)) ||
    ytAccounts[0];

  const reconnectMut = useMutation({
    mutationFn: async () =>
      start({ data: { platform: "youtube", origin: window.location.origin } }),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't reconnect"),
  });

  const disconnectMut = useMutation({
    mutationFn: async (id: string) => disconnect({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social-accounts"] });
      qc.invalidateQueries({ queryKey: ["youtube-channel-details"] });
      toast.success("Disconnected");
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't disconnect"),
  });

  const copy = (label: string, value: string) => {
    navigator.clipboard.writeText(value).then(() => toast.success(`${label} copied`));
  };

  const data = detailsQuery.data;

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <AnimatedOrbs />
      <AppHeader right={<ProfileMenu />} />

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-40">
        <Link
          to="/poster"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Poster
        </Link>

        {detailsQuery.isLoading && (
          <div className="glass-strong rounded-2xl p-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading channel…
          </div>
        )}

        {detailsQuery.isError && (
          <div className="glass-strong rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                <Youtube className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Couldn't load channel</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {(detailsQuery.error as any)?.message ??
                    "Something went wrong."}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => detailsQuery.refetch()}
                    className="rounded-xl glass-strong px-3 py-2 text-xs hover:bg-white/[0.06] inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                  </button>
                  <button
                    onClick={() => reconnectMut.mutate()}
                    disabled={reconnectMut.isPending}
                    className="rounded-xl bg-white text-black px-3 py-2 text-xs font-medium hover:bg-white/90 inline-flex items-center gap-1.5"
                  >
                    Reconnect YouTube
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {data && (
          <>
            {data.banner && (
              <div className="rounded-2xl overflow-hidden mb-6 aspect-[6/1] bg-white/[0.03]">
                <img
                  src={data.banner}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="glass-strong rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-4 flex-wrap">
                {data.thumbnail && (
                  <img
                    src={data.thumbnail}
                    alt=""
                    className="w-16 h-16 rounded-full shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">
                    {data.title}
                  </h1>
                  <div className="text-sm text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                    {data.handle && (
                      <span className="inline-flex items-center gap-1">
                        @{data.handle.replace(/^@/, "")}
                        <button
                          onClick={() =>
                            copy("Handle", data.handle!.replace(/^@/, ""))
                          }
                          className="hover:text-foreground/80 p-0.5 rounded"
                          title="Copy handle"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                      {data.id}
                      <button
                        onClick={() => copy("Channel ID", data.id)}
                        className="hover:text-foreground/80 p-0.5 rounded"
                        title="Copy channel ID"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </span>
                    <a
                      href={`https://www.youtube.com/channel/${data.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 hover:text-foreground/80"
                    >
                      Open on YouTube <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {data.description && (
                <p className="text-sm text-muted-foreground mt-4 whitespace-pre-line line-clamp-4">
                  {data.description}
                </p>
              )}

              <div className="mt-5 grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                <Link
                  to="/poster/new"
                  className="rounded-xl bg-white text-black px-4 h-10 text-xs font-medium hover:bg-white/90 inline-flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> New post
                </Link>
                <Link
                  to="/poster/series/new"
                  className="rounded-xl glass-strong px-4 h-10 text-xs font-medium hover:bg-white/[0.06] inline-flex items-center justify-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" /> New series
                </Link>
                <Link
                  to="/poster/youtube-analytics"
                  search={ytAccount ? { accountId: ytAccount.id } : undefined}
                  className="rounded-xl glass-strong px-4 h-10 text-xs font-medium hover:bg-white/[0.06] inline-flex items-center justify-center gap-1.5"
                >
                  <BarChart3 className="w-3.5 h-3.5" /> Analytics
                </Link>
                <button
                  onClick={() => reconnectMut.mutate()}
                  disabled={reconnectMut.isPending}
                  className="rounded-xl glass-strong px-4 h-10 text-xs font-medium hover:bg-white/[0.06] inline-flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reconnect
                </button>
                {ytAccount && (
                  <button
                    onClick={() => {
                      if (confirm("Disconnect YouTube?"))
                        disconnectMut.mutate(ytAccount.id);
                    }}
                    disabled={disconnectMut.isPending}
                    className="rounded-xl px-4 h-10 text-xs font-medium text-muted-foreground hover:text-red-400 hover:bg-white/[0.03] inline-flex items-center justify-center gap-1.5 col-span-2 sm:col-span-1"
                  >
                    <Unlink className="w-3.5 h-3.5" /> Disconnect
                  </button>
                )}
              </div>
            </div>


            <div className="grid grid-cols-3 gap-3 mb-6">
              <StatCard
                icon={Users}
                label="Subscribers"
                value={
                  data.stats.hiddenSubs
                    ? "Hidden"
                    : formatNumber(data.stats.subscribers)
                }
              />
              <StatCard
                icon={Eye}
                label="Total views"
                value={formatNumber(data.stats.views)}
              />
              <StatCard
                icon={Film}
                label="Videos"
                value={formatNumber(data.stats.videos)}
              />
            </div>

            <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3">
              Recent uploads
            </h2>

            {data.recentVideos.length === 0 ? (
              <div className="glass-strong rounded-2xl p-6 text-sm text-muted-foreground text-center">
                No videos on this channel yet.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.recentVideos.map((v) => (
                  <a
                    key={v.id}
                    href={`https://youtu.be/${v.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="glass-strong rounded-2xl overflow-hidden hover:bg-white/[0.04] transition-colors group"
                  >
                    {v.thumbnail && (
                      <div className="relative aspect-video bg-black/40">
                        <img
                          src={v.thumbnail}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        {v.duration && (
                          <span className="absolute bottom-2 right-2 text-[10px] font-medium bg-black/70 rounded px-1.5 py-0.5">
                            {parseIsoDuration(v.duration)}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="p-4">
                      <div className="font-medium text-sm line-clamp-2 group-hover:text-white">
                        {v.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {new Date(v.publishedAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {formatNumber(v.views)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />{" "}
                          {formatNumber(v.likes)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />{" "}
                          {formatNumber(v.comments)}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="glass-strong rounded-2xl p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="text-xl sm:text-2xl font-semibold mt-1.5 tracking-tight">
        {value}
      </div>
    </div>
  );
}
