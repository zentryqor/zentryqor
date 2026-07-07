import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { YouTubeAnalyticsReport } from "@/lib/youtube-analytics-report.functions";
import {
  ArrowLeft,
  BarChart3,
  Download,
  Eye,
  FileText,
  Film,
  Loader2,
  MessageSquare,
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

export const Route = createFileRoute("/_authenticated/poster/youtube-analytics")({
  validateSearch: (search: Record<string, unknown>) => ({
    accountId:
      typeof search.accountId === "string" ? search.accountId : undefined,
  }),
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
  const { accountId } = Route.useSearch();
  const fetchReport = useServerFn(getYouTubeAnalyticsReport);
  const start = useServerFn(startSocialOAuth);
  const [days, setDays] = useState<7 | 14 | 30>(7);
  const [topN, setTopN] = useState<5 | 10 | 15>(5);
  const q = useQuery({
    queryKey: ["youtube-analytics-report", days, accountId ?? "latest"],
    queryFn: () => fetchReport({ data: { days, accountId } }),
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
          to="/poster/youtube"
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
            <div className="flex gap-2 print:hidden flex-wrap">
              <div className="inline-flex rounded-xl glass-strong p-0.5 h-10 items-stretch">
                {([7, 14, 30] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`px-3 rounded-lg text-xs font-medium transition ${
                      days === d
                        ? "bg-white text-black"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
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
                  <div className="text-xs text-muted-foreground">Last {data.rangeDays} days</div>
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

                {data.audience.countriesTrend &&
                  data.audience.countriesTrend.series.length > 0 && (
                    <CountriesTrendChart
                      trend={data.audience.countriesTrend}
                      days={data.rangeDays}
                      topN={topN}
                      onChangeTopN={setTopN}
                    />
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

function csvEscape(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportCsv(data: YouTubeAnalyticsReport) {
  const lines: string[] = [];
  const push = (row: (string | number)[]) =>
    lines.push(row.map(csvEscape).join(","));

  push(["Section", "Metric", "Value"]);
  push(["Totals", "Subscribers", data.totals.hiddenSubs ? "Hidden" : data.totals.subscribers]);
  push(["Totals", "Views", data.totals.views]);
  push(["Totals", "Likes", data.totals.likes]);
  push(["Totals", "Comments", data.totals.comments]);
  push(["Totals", "Shares", data.totals.shares]);
  push(["Totals", "Videos", data.totals.videos]);

  if (data.recentViews) {
    lines.push("");
    push(["Recent views (last 7 days)", "Date", "Views"]);
    for (const d of data.recentViews.daily) push(["", d.date, d.views]);
    push(["", "Total", data.recentViews.last7Days]);
  }

  if (data.topShorts.length) {
    lines.push("");
    push(["Top Shorts", "Title", "Views", "URL"]);
    for (const s of data.topShorts)
      push(["", s.title, s.views, `https://youtube.com/shorts/${s.id}`]);
  }

  if (data.topVideos.length) {
    lines.push("");
    push(["Top videos", "Title", "Views", "Published", "URL"]);
    for (const v of data.topVideos)
      push([
        "",
        v.title,
        v.views,
        v.publishedAt.slice(0, 10),
        `https://youtu.be/${v.id}`,
      ]);
  }

  if (data.audience?.ageGender.length) {
    lines.push("");
    push(["Audience age/gender (last 90d, %)", "Age", "Male", "Female", "Other"]);
    for (const r of data.audience.ageGender)
      push(["", r.bucket, r.male.toFixed(1), r.female.toFixed(1), r.other.toFixed(1)]);
  }

  if (data.audience?.countries.length) {
    lines.push("");
    push(["Top countries (last 90d)", "Country", "Views", "Share %"]);
    for (const c of data.audience.countries)
      push(["", c.country, c.views, (c.share * 100).toFixed(1)]);
  }

  if (data.audience?.countriesTrend) {
    const t = data.audience.countriesTrend;
    lines.push("");
    push([
      `Country views by day (last ${data.rangeDays}d)`,
      "Country",
      ...t.dates,
      "Total",
    ]);
    for (const s of t.series) push(["", s.country, ...s.views, s.total]);
  }

  const date = new Date().toISOString().slice(0, 10);
  downloadFile(`youtube-analytics-${date}.csv`, lines.join("\n"), "text/csv");
}

const TREND_COLORS = [
  "#38bdf8", // sky
  "#f472b6", // pink
  "#34d399", // emerald
  "#fbbf24", // amber
  "#a78bfa", // violet
  "#f87171", // red
  "#60a5fa", // blue
  "#4ade80", // green
  "#facc15", // yellow
  "#c084fc", // purple
  "#fb923c", // orange
  "#22d3ee", // cyan
  "#e879f9", // fuchsia
  "#a3e635", // lime
  "#94a3b8", // slate
];

function CountriesTrendChart({
  trend,
  days,
  topN,
  onChangeTopN,
}: {
  trend: NonNullable<
    NonNullable<YouTubeAnalyticsReport["audience"]>["countriesTrend"]
  >;
  days: number;
  topN: 5 | 10 | 15;
  onChangeTopN: (n: 5 | 10 | 15) => void;
}) {
  const { dates } = trend;
  const series = trend.series.slice(0, topN);
  const width = 640;
  const height = 220;
  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 22;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const max = Math.max(
    1,
    ...series.flatMap((s) => s.views),
  );
  const stepX = dates.length > 1 ? innerW / (dates.length - 1) : 0;
  const y = (v: number) => padT + innerH - (v / max) * innerH;
  const x = (i: number) => padL + i * stepX;

  return (
    <div className="glass-strong rounded-2xl p-5 mt-3">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="text-xs text-muted-foreground">
          Country views · last {days} days
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Show top</span>
          <div className="inline-flex rounded-lg glass-strong p-0.5 h-7 items-stretch">
            {([5, 10, 15] as const).map((n) => (
              <button
                key={n}
                onClick={() => onChangeTopN(n)}
                className={`px-2 rounded-md text-[11px] font-medium transition ${
                  topN === n
                    ? "bg-white text-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-56"
          role="img"
          aria-label="Country views over time"
        >
          {/* gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1={padL}
              x2={padL + innerW}
              y1={padT + innerH * f}
              y2={padT + innerH * f}
              stroke="rgba(255,255,255,0.06)"
            />
          ))}
          {/* y-axis labels */}
          {[0, 0.5, 1].map((f) => (
            <text
              key={f}
              x={padL - 6}
              y={padT + innerH * (1 - f) + 3}
              textAnchor="end"
              fontSize="9"
              fill="rgba(255,255,255,0.5)"
            >
              {Math.round(max * f)}
            </text>
          ))}
          {/* series */}
          {series.map((s, si) => {
            const color = TREND_COLORS[si % TREND_COLORS.length];
            const d = s.views
              .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`)
              .join(" ");
            return (
              <g key={s.country}>
                <path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.6}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {s.views.map((v, i) => (
                  <circle
                    key={i}
                    cx={x(i)}
                    cy={y(v)}
                    r={2}
                    fill={color}
                  >
                    <title>{`${s.country} · ${dates[i]}: ${v} views`}</title>
                  </circle>
                ))}
              </g>
            );
          })}
          {/* x-axis labels: first, middle, last */}
          {[0, Math.floor((dates.length - 1) / 2), dates.length - 1]
            .filter((v, i, a) => a.indexOf(v) === i)
            .map((i) => (
              <text
                key={i}
                x={x(i)}
                y={height - 6}
                textAnchor="middle"
                fontSize="9"
                fill="rgba(255,255,255,0.5)"
              >
                {dates[i]?.slice(5)}
              </text>
            ))}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        {series.map((s, si) => (
          <span key={s.country} className="inline-flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: TREND_COLORS[si % TREND_COLORS.length] }}
            />
            {s.country} · {s.total.toLocaleString()}
          </span>
        ))}
      </div>
    </div>
  );
}


