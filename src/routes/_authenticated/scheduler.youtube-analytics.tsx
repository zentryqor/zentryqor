import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  BarChart3,
  Download,
  Eye,
  FileText,
  Film,
  Loader2,
  MessageSquare,
  Printer,
  RefreshCw,
  Share2,
  ThumbsUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { ProfileMenu } from "@/components/ProfileMenu";
import { getYouTubeAnalyticsReport } from "@/lib/youtube-analytics-report.functions";
import { startSocialOAuth } from "@/lib/social.functions";

export const Route = createFileRoute("/_authenticated/scheduler/youtube-analytics")({
  head: () => ({
    meta: [
      { title: "YouTube analytics — Zentry Qor" },
      { name: "description", content: "Deep analytics for your connected YouTube channel." },
    ],
  }),
  component: AnalyticsPage,
});

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "k";
  return n.toLocaleString();
}

function AnalyticsPage() {
  const fetchReport = useServerFn(getYouTubeAnalyticsReport);
  const start = useServerFn(startSocialOAuth);
  const q = useQuery({
    queryKey: ["youtube-analytics-report"],
    queryFn: () => fetchReport(),
    retry: 1,
  });
  const reconnectMut = useMutation({
    mutationFn: async () =>
      start({ data: { platform: "youtube", origin: window.location.origin } }),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't reconnect"),
  });

  const data = q.data;
  const maxDaily = Math.max(
    1,
    ...(data?.recentViews?.daily.map((d) => d.views) ?? [0]),
  );

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <AnimatedOrbs />
      <AppHeader right={<ProfileMenu />} />

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-40">
        <Link
          to="/scheduler/youtube"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to channel
        </Link>

        <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                Analytics
              </h1>
              <p className="text-xs text-muted-foreground">
                Views, engagement and audience insights.
              </p>
            </div>
          </div>
          {data && (
            <div className="flex gap-2 print:hidden">
              <button
                onClick={() => exportCsv(data)}
                className="rounded-xl glass-strong px-3 h-10 text-xs font-medium hover:bg-white/[0.06] inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button
                onClick={() => window.print()}
                className="rounded-xl bg-white text-black px-3 h-10 text-xs font-medium hover:bg-white/90 inline-flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" /> PDF
              </button>
            </div>
          )}
        </div>

        {q.isLoading && (
          <div className="glass-strong rounded-2xl p-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">

            <Loader2 className="w-4 h-4 animate-spin" /> Loading analytics…
          </div>
        )}

        {q.isError && (
          <div className="glass-strong rounded-2xl p-6">
            <div className="font-medium">Couldn't load analytics</div>
            <div className="text-sm text-muted-foreground mt-1">
              {(q.error as any)?.message ?? "Something went wrong."}
            </div>
            <button
              onClick={() => q.refetch()}
              className="mt-4 rounded-xl glass-strong px-3 py-2 text-xs hover:bg-white/[0.06] inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {data && (
          <>
            {data.scopeMissing && (
              <div className="glass-strong rounded-2xl p-4 mb-6 text-sm">
                <div className="font-medium">Enable deeper analytics</div>
                <div className="text-muted-foreground mt-1">
                  Reconnect YouTube to grant access to recent-view trends and
                  audience demographics.
                </div>
                <button
                  onClick={() => reconnectMut.mutate()}
                  disabled={reconnectMut.isPending}
                  className="mt-3 rounded-xl bg-white text-black px-3 py-2 text-xs font-medium hover:bg-white/90"
                >
                  Reconnect YouTube
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <Stat
                icon={Users}
                label="Subscribers"
                value={data.totals.hiddenSubs ? "Hidden" : fmt(data.totals.subscribers)}
              />
              <Stat icon={Eye} label="Views" value={fmt(data.totals.views)} />
              <Stat icon={ThumbsUp} label="Likes" value={fmt(data.totals.likes)} />
              <Stat
                icon={MessageSquare}
                label="Comments"
                value={fmt(data.totals.comments)}
              />
              <Stat icon={Share2} label="Shares" value={fmt(data.totals.shares)} />
              <Stat icon={Film} label="Videos" value={fmt(data.totals.videos)} />
            </div>

            {data.recentViews && (
              <section className="glass-strong rounded-2xl p-5 mb-6">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-semibold">Recent views</h2>
                  <div className="text-xs text-muted-foreground">Last 7 days</div>
                </div>
                <div className="mt-2 text-3xl font-semibold tracking-tight">
                  {fmt(data.recentViews.last7Days)}
                </div>
                <div className="mt-4 flex items-end gap-1.5 h-24">
                  {data.recentViews.daily.map((d) => (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t bg-sky-400/70"
                        style={{ height: `${Math.max(4, (d.views / maxDaily) * 100)}%` }}
                        title={`${d.date}: ${d.views} views`}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>{data.recentViews.daily[0]?.date.slice(5)}</span>
                  <span>
                    {data.recentViews.daily[data.recentViews.daily.length - 1]?.date.slice(5)}
                  </span>
                </div>
              </section>
            )}

            {data.latestCreation && (
              <section className="mb-6">
                <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3">
                  Latest creation
                </h2>
                <a
                  href={`https://youtu.be/${data.latestCreation.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="glass-strong rounded-2xl p-3 flex gap-4 hover:bg-white/[0.04]"
                >
                  {data.latestCreation.thumbnail && (
                    <img
                      src={data.latestCreation.thumbnail}
                      alt=""
                      className="w-40 aspect-video object-cover rounded-xl shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium line-clamp-2">
                      {data.latestCreation.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {new Date(data.latestCreation.publishedAt).toLocaleDateString()}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {fmt(data.latestCreation.views)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" /> {fmt(data.latestCreation.likes)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {fmt(data.latestCreation.comments)}
                      </span>
                    </div>
                  </div>
                </a>
              </section>
            )}

            {data.topShorts.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3">
                  Top Shorts
                </h2>
                <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2">
                  {data.topShorts.map((s) => (
                    <a
                      key={s.id}
                      href={`https://youtube.com/shorts/${s.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-32 shrink-0 group"
                    >
                      <div className="aspect-[9/16] rounded-xl overflow-hidden bg-black/40">
                        {s.thumbnail && (
                          <img
                            src={s.thumbnail}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        )}
                      </div>
                      <div className="mt-1.5 text-xs font-medium">
                        {fmt(s.views)} views
                      </div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1">
                        {s.title}
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {data.topVideos.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3">
                  Top videos and live streams
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.topVideos.map((v) => (
                    <a
                      key={v.id}
                      href={`https://youtu.be/${v.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="glass-strong rounded-2xl overflow-hidden hover:bg-white/[0.04]"
                    >
                      {v.thumbnail && (
                        <div className="aspect-video bg-black/40">
                          <img
                            src={v.thumbnail}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-3">
                        <div className="font-medium text-sm line-clamp-2">{v.title}</div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {fmt(v.views)} views ·{" "}
                          {new Date(v.publishedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {data.audience && (
              <section className="mb-6">
                <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3">
                  Your audience
                </h2>

                {data.audience.ageGender.length > 0 && (
                  <div className="glass-strong rounded-2xl p-5 mb-3">
                    <div className="text-xs text-muted-foreground mb-3">
                      Age & gender · last 90 days
                    </div>
                    <div className="space-y-3">
                      {data.audience.ageGender.map((r) => {
                        const total = r.male + r.female + r.other;
                        return (
                          <div key={r.bucket}>
                            <div className="flex justify-between text-xs mb-1">
                              <span>{r.bucket}</span>
                              <span className="text-muted-foreground">
                                {total.toFixed(0)}%
                              </span>
                            </div>
                            <div className="flex h-2 rounded-full overflow-hidden bg-white/[0.05]">
                              <div
                                className="bg-sky-400"
                                style={{ width: `${r.male}%` }}
                                title={`Male ${r.male.toFixed(1)}%`}
                              />
                              <div
                                className="bg-pink-400"
                                style={{ width: `${r.female}%` }}
                                title={`Female ${r.female.toFixed(1)}%`}
                              />
                              <div
                                className="bg-white/40"
                                style={{ width: `${r.other}%` }}
                                title={`Other ${r.other.toFixed(1)}%`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-4 mt-4 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-400" /> Male
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-pink-400" /> Female
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-white/40" /> Other
                      </span>
                    </div>
                  </div>
                )}

                {data.audience.countries.length > 0 && (
                  <div className="glass-strong rounded-2xl p-5">
                    <div className="text-xs text-muted-foreground mb-3">
                      Top countries · last 90 days
                    </div>
                    <div className="space-y-2">
                      {data.audience.countries.map((c) => (
                        <div key={c.country}>
                          <div className="flex justify-between text-xs mb-1">
                            <span>{c.country}</span>
                            <span className="text-muted-foreground">
                              {(c.share * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                            <div
                              className="h-full bg-emerald-400/80"
                              style={{ width: `${c.share * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Stat({
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
      <div className="text-xl font-semibold mt-1.5 tracking-tight">{value}</div>
    </div>
  );
}
