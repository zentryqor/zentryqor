import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Layers,
  Play,
  Trash2,
  Clock,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Image as ImageIcon,
  FileText,
  Power,
} from "lucide-react";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { AppHeader, AppHeaderLink } from "@/components/AppHeader";
import {
  listBatches,
  createBatch,
  getBatch,
  tickBatch,
  cancelBatch,
  deleteBatch,
  listScheduled,
  createScheduled,
  toggleScheduled,
  deleteScheduled,
} from "@/lib/batch.functions";
import { getAiCredits } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/batch")({
  ssr: false,
  head: () => ({ meta: [{ title: "Batch & Scheduled — Zentry Qor" }] }),
  component: BatchPage,
});

function BatchPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"batch" | "scheduled">("batch");
  const [showNew, setShowNew] = useState<"batch" | "scheduled" | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const fetchBatches = useServerFn(listBatches);
  const fetchScheduled = useServerFn(listScheduled);
  const fetchCredits = useServerFn(getAiCredits);
  const batches = useQuery({ queryKey: ["batches"], queryFn: () => fetchBatches() });
  const scheduled = useQuery({ queryKey: ["scheduled"], queryFn: () => fetchScheduled() });
  const credits = useQuery({ queryKey: ["ai-credits"], queryFn: () => fetchCredits() });

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <AnimatedOrbs />
      <div className="relative pb-24">
        <AppHeader
          nav={
            <>
              <AppHeaderLink to="/dashboard">Dashboard</AppHeaderLink>
              <AppHeaderLink to="/ai">AI Studio</AppHeaderLink>
              <AppHeaderLink to="/library">Library</AppHeaderLink>
              <AppHeaderLink to="/batch" active>Batch</AppHeaderLink>
            </>
          }
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-10">
          <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3 flex items-center gap-1.5">
                <Layers className="h-3 w-3 text-accent" /> Automation
              </div>
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em]">
                Batch & <span className="text-gradient-brand">scheduled</span> generation.
              </h1>
              <p className="text-sm text-muted-foreground mt-3 max-w-xl">
                Queue up dozens of prompts at once, or set them to run on a cadence. Every output auto-saves to your library.
              </p>
            </div>
            <button
              onClick={() => setShowNew(tab)}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition"
            >
              <Plus className="h-4 w-4" /> New {tab === "batch" ? "batch" : "schedule"}
            </button>
          </div>

          {/* Tabs */}
          <div className="inline-flex rounded-xl bg-elevated/40 border border-border/60 p-1 mb-6">
            <TabBtn active={tab === "batch"} onClick={() => setTab("batch")} icon={<Layers className="h-3.5 w-3.5" />}>
              Batches
            </TabBtn>
            <TabBtn active={tab === "scheduled"} onClick={() => setTab("scheduled")} icon={<Clock className="h-3.5 w-3.5" />}>
              Scheduled {credits.data?.isPremium ? "" : "· Premium"}
            </TabBtn>
          </div>

          {tab === "batch" ? (
            <BatchList
              items={batches.data ?? []}
              loading={batches.isLoading}
              onOpen={setActiveId}
              onRefresh={() => qc.invalidateQueries({ queryKey: ["batches"] })}
            />
          ) : (
            <ScheduledList
              items={scheduled.data ?? []}
              loading={scheduled.isLoading}
              isPremium={!!credits.data?.isPremium}
              onRefresh={() => qc.invalidateQueries({ queryKey: ["scheduled"] })}
            />
          )}
        </main>
      </div>

      {showNew === "batch" && (
        <NewBatchModal
          onClose={() => setShowNew(null)}
          onCreated={(id) => {
            qc.invalidateQueries({ queryKey: ["batches"] });
            setActiveId(id);
          }}
        />
      )}
      {showNew === "scheduled" && (
        <NewScheduledModal
          isPremium={!!credits.data?.isPremium}
          onClose={() => setShowNew(null)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["scheduled"] })}
        />
      )}
      {activeId && <BatchDetailModal id={activeId} onClose={() => setActiveId(null)} />}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-xs font-medium transition ${
        active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function BatchList({
  items,
  loading,
  onOpen,
  onRefresh,
}: {
  items: any[];
  loading: boolean;
  onOpen: (id: string) => void;
  onRefresh: () => void;
}) {
  const cancelFn = useServerFn(cancelBatch);
  const delFn = useServerFn(deleteBatch);
  const tickFn = useServerFn(tickBatch);

  if (loading) return <div className="text-sm text-muted-foreground p-8">Loading…</div>;
  if (items.length === 0)
    return (
      <div className="rounded-3xl border border-border/60 bg-elevated/30 p-12 text-center">
        <Layers className="h-8 w-8 text-accent mx-auto mb-4" />
        <div className="text-lg font-medium">No batches yet</div>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
          Paste a list of prompts, hit run, come back to results. Great for A/B thumbnails or bulk captions.
        </p>
      </div>
    );

  return (
    <div className="space-y-3">
      {items.map((b) => {
        const pct = b.total > 0 ? Math.round((b.completed / b.total) * 100) : 0;
        return (
          <div
            key={b.id}
            className="rounded-2xl border border-border/60 bg-elevated/40 hover:border-foreground/30 transition p-5"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <button onClick={() => onOpen(b.id)} className="text-left flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <StatusPill status={b.status} />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {b.kind === "image" ? "Image" : "Text"}
                  </span>
                </div>
                <div className="text-sm font-medium truncate">{b.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {b.completed}/{b.total} done{b.failed > 0 && ` · ${b.failed} failed`}
                </div>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                {(b.status === "queued" || b.status === "running") && (
                  <button
                    onClick={async () => {
                      await tickFn({ data: { id: b.id } });
                      onRefresh();
                    }}
                    className="h-8 px-2.5 rounded-lg border border-border/60 hover:border-foreground/40 text-xs flex items-center gap-1"
                    title="Process next items"
                  >
                    <Play className="h-3 w-3" /> Tick
                  </button>
                )}
                {(b.status === "queued" || b.status === "running") && (
                  <button
                    onClick={async () => {
                      if (confirm("Cancel this batch?")) {
                        await cancelFn({ data: { id: b.id } });
                        onRefresh();
                      }
                    }}
                    className="h-8 w-8 rounded-lg border border-border/60 hover:border-destructive/50 hover:text-destructive text-xs flex items-center justify-center"
                    title="Cancel"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={async () => {
                    if (confirm("Delete this batch and all its results?")) {
                      await delFn({ data: { id: b.id } });
                      onRefresh();
                    }
                  }}
                  className="h-8 w-8 rounded-lg border border-border/60 hover:border-destructive/50 hover:text-destructive text-xs flex items-center justify-center"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { c: string; label: string; icon: React.ReactNode }> = {
    queued: { c: "text-amber-400 border-amber-500/30 bg-amber-500/10", label: "Queued", icon: <Clock className="h-2.5 w-2.5" /> },
    running: { c: "text-blue-400 border-blue-500/30 bg-blue-500/10", label: "Running", icon: <Loader2 className="h-2.5 w-2.5 animate-spin" /> },
    completed: { c: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", label: "Done", icon: <CheckCircle2 className="h-2.5 w-2.5" /> },
    failed: { c: "text-red-400 border-red-500/30 bg-red-500/10", label: "Failed", icon: <XCircle className="h-2.5 w-2.5" /> },
    canceled: { c: "text-muted-foreground border-border/60 bg-white/[0.02]", label: "Canceled", icon: <XCircle className="h-2.5 w-2.5" /> },
  };
  const m = map[status] ?? map.queued;
  return (
    <span className={`inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-[10px] uppercase tracking-wider border ${m.c}`}>
      {m.icon}
      {m.label}
    </span>
  );
}

function ScheduledList({
  items,
  loading,
  isPremium,
  onRefresh,
}: {
  items: any[];
  loading: boolean;
  isPremium: boolean;
  onRefresh: () => void;
}) {
  const toggleFn = useServerFn(toggleScheduled);
  const delFn = useServerFn(deleteScheduled);
  if (loading) return <div className="text-sm text-muted-foreground p-8">Loading…</div>;
  if (!isPremium) {
    return (
      <div className="rounded-3xl border border-accent/40 bg-gradient-to-br from-primary/10 to-accent/10 p-12 text-center">
        <Sparkles className="h-8 w-8 text-accent mx-auto mb-4" />
        <div className="text-lg font-medium">Scheduled runs are a Premium feature</div>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
          Run prompts automatically hourly, daily, or weekly. Perfect for daily social posts or scheduled reports.
        </p>
        <Link to="/billing" className="mt-6 inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-foreground text-background text-sm font-medium">
          Upgrade to Premium
        </Link>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-border/60 bg-elevated/30 p-12 text-center">
        <Clock className="h-8 w-8 text-accent mx-auto mb-4" />
        <div className="text-lg font-medium">No scheduled jobs yet</div>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
          Set a name, cadence, and list of prompts. We'll fire them off automatically.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((s) => (
        <div key={s.id} className="rounded-2xl border border-border/60 bg-elevated/40 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{s.kind}</span>
                <span className={`text-[10px] uppercase tracking-wider px-2 h-4 inline-flex items-center rounded-full ${s.active ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-muted-foreground"}`}>
                  {s.active ? "Active" : "Paused"}
                </span>
              </div>
              <div className="text-sm font-medium truncate">{s.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {s.cadence} at {String(s.hour_utc).padStart(2, "0")}:00 UTC · {s.prompts.length} prompts
                {s.next_run_at && ` · next: ${new Date(s.next_run_at).toLocaleString()}`}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={async () => {
                  await toggleFn({ data: { id: s.id, active: !s.active } });
                  onRefresh();
                }}
                className="h-8 px-2.5 rounded-lg border border-border/60 hover:border-foreground/40 text-xs flex items-center gap-1"
              >
                <Power className="h-3 w-3" /> {s.active ? "Pause" : "Resume"}
              </button>
              <button
                onClick={async () => {
                  if (confirm("Delete this schedule?")) {
                    await delFn({ data: { id: s.id } });
                    onRefresh();
                  }
                }}
                className="h-8 w-8 rounded-lg border border-border/60 hover:border-destructive/50 hover:text-destructive flex items-center justify-center"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-3xl bg-background border border-border/70 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

function NewBatchModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("Untitled batch");
  const [kind, setKind] = useState<"text" | "image">("text");
  const [aspect, setAspect] = useState<"16:9" | "9:16" | "4:3" | "3:4">("16:9");
  const [system, setSystem] = useState("");
  const [promptsRaw, setPromptsRaw] = useState("");
  const createFn = useServerFn(createBatch);
  const mut = useMutation({
    mutationFn: async () => {
      const prompts = promptsRaw.split("\n").map((s) => s.trim()).filter(Boolean);
      if (prompts.length === 0) throw new Error("Add at least one prompt (one per line)");
      return createFn({
        data: {
          name,
          kind,
          prompts,
          systemPrompt: system || undefined,
          aspectRatio: kind === "image" ? aspect : undefined,
        },
      });
    },
    onSuccess: (r) => {
      toast.success("Batch created — processing…");
      onCreated(r.id);
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <ModalShell title="New batch" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 rounded-lg bg-elevated/40 border border-border/60 px-3 text-sm" />
        </Field>
        <Field label="Kind">
          <div className="inline-flex rounded-xl bg-elevated/40 border border-border/60 p-1">
            <KindBtn active={kind === "text"} onClick={() => setKind("text")} icon={<FileText className="h-3.5 w-3.5" />}>Text</KindBtn>
            <KindBtn active={kind === "image"} onClick={() => setKind("image")} icon={<ImageIcon className="h-3.5 w-3.5" />}>Image</KindBtn>
          </div>
        </Field>
        {kind === "image" && (
          <Field label="Aspect ratio">
            <select value={aspect} onChange={(e) => setAspect(e.target.value as any)} className="h-10 rounded-lg bg-elevated/40 border border-border/60 px-3 text-sm">
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
              <option value="4:3">4:3</option>
              <option value="3:4">3:4</option>
            </select>
          </Field>
        )}
        {kind === "text" && (
          <Field label="System prompt (optional)">
            <textarea value={system} onChange={(e) => setSystem(e.target.value)} rows={2} className="w-full rounded-lg bg-elevated/40 border border-border/60 px-3 py-2 text-sm" placeholder="You are a helpful writing assistant…" />
          </Field>
        )}
        <Field label={`Prompts (one per line, max 50)`}>
          <textarea
            value={promptsRaw}
            onChange={(e) => setPromptsRaw(e.target.value)}
            rows={8}
            className="w-full rounded-lg bg-elevated/40 border border-border/60 px-3 py-2 text-sm font-mono"
            placeholder="Write a tweet about AI.&#10;Write a LinkedIn post about AI.&#10;Write a headline about AI."
          />
          <div className="text-[11px] text-muted-foreground mt-1">
            {promptsRaw.split("\n").filter((s) => s.trim()).length} prompts · Costs {kind === "image" ? 30 : 10} credits each
          </div>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border border-border/60 text-sm">Cancel</button>
          <button
            disabled={mut.isPending}
            onClick={() => mut.mutate()}
            className="h-10 px-5 rounded-lg bg-foreground text-background text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {mut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Run batch
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function NewScheduledModal({ isPremium, onClose, onCreated }: { isPremium: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("Daily post");
  const [kind, setKind] = useState<"text" | "image">("text");
  const [cadence, setCadence] = useState<"hourly" | "daily" | "weekly">("daily");
  const [hourUtc, setHourUtc] = useState(9);
  const [weekday, setWeekday] = useState(1);
  const [aspect, setAspect] = useState<"16:9" | "9:16" | "4:3" | "3:4">("16:9");
  const [system, setSystem] = useState("");
  const [promptsRaw, setPromptsRaw] = useState("");
  const createFn = useServerFn(createScheduled);
  const mut = useMutation({
    mutationFn: async () => {
      const prompts = promptsRaw.split("\n").map((s) => s.trim()).filter(Boolean);
      if (prompts.length === 0) throw new Error("Add at least one prompt");
      return createFn({
        data: {
          name,
          kind,
          prompts,
          systemPrompt: system || undefined,
          aspectRatio: kind === "image" ? aspect : undefined,
          cadence,
          hourUtc,
          weekday: cadence === "weekly" ? weekday : null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Schedule created");
      onCreated();
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (!isPremium) {
    return (
      <ModalShell title="Premium required" onClose={onClose}>
        <p className="text-sm text-muted-foreground">
          Scheduled jobs unlock on Premium. <Link to="/billing" className="text-accent underline">Upgrade →</Link>
        </p>
      </ModalShell>
    );
  }

  return (
    <ModalShell title="New scheduled job" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 rounded-lg bg-elevated/40 border border-border/60 px-3 text-sm" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kind">
            <select value={kind} onChange={(e) => setKind(e.target.value as any)} className="w-full h-10 rounded-lg bg-elevated/40 border border-border/60 px-3 text-sm">
              <option value="text">Text</option>
              <option value="image">Image</option>
            </select>
          </Field>
          <Field label="Cadence">
            <select value={cadence} onChange={(e) => setCadence(e.target.value as any)} className="w-full h-10 rounded-lg bg-elevated/40 border border-border/60 px-3 text-sm">
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {cadence !== "hourly" && (
            <Field label="Hour (UTC)">
              <select value={hourUtc} onChange={(e) => setHourUtc(Number(e.target.value))} className="w-full h-10 rounded-lg bg-elevated/40 border border-border/60 px-3 text-sm">
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                ))}
              </select>
            </Field>
          )}
          {cadence === "weekly" && (
            <Field label="Weekday">
              <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className="w-full h-10 rounded-lg bg-elevated/40 border border-border/60 px-3 text-sm">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d, i) => (<option key={i} value={i}>{d}</option>))}
              </select>
            </Field>
          )}
          {kind === "image" && (
            <Field label="Aspect ratio">
              <select value={aspect} onChange={(e) => setAspect(e.target.value as any)} className="w-full h-10 rounded-lg bg-elevated/40 border border-border/60 px-3 text-sm">
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="4:3">4:3</option>
                <option value="3:4">3:4</option>
              </select>
            </Field>
          )}
        </div>
        {kind === "text" && (
          <Field label="System prompt (optional)">
            <textarea value={system} onChange={(e) => setSystem(e.target.value)} rows={2} className="w-full rounded-lg bg-elevated/40 border border-border/60 px-3 py-2 text-sm" />
          </Field>
        )}
        <Field label="Prompts (one per line, max 20)">
          <textarea value={promptsRaw} onChange={(e) => setPromptsRaw(e.target.value)} rows={6} className="w-full rounded-lg bg-elevated/40 border border-border/60 px-3 py-2 text-sm font-mono" />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border border-border/60 text-sm">Cancel</button>
          <button
            disabled={mut.isPending}
            onClick={() => mut.mutate()}
            className="h-10 px-5 rounded-lg bg-foreground text-background text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {mut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create schedule
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function BatchDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const fetchFn = useServerFn(getBatch);
  const tickFn = useServerFn(tickBatch);
  const q = useQuery({
    queryKey: ["batch", id],
    queryFn: () => fetchFn({ data: { id } }),
    refetchInterval: 3000,
  });

  // Auto-tick while running/queued
  useEffect(() => {
    const job = q.data?.job;
    if (!job) return;
    if (job.status === "queued" || job.status === "running") {
      const hasPending = q.data!.items.some((i) => i.status === "pending");
      if (hasPending) {
        const t = setTimeout(() => {
          tickFn({ data: { id } }).finally(() => qc.invalidateQueries({ queryKey: ["batch", id] }));
        }, 1500);
        return () => clearTimeout(t);
      }
    }
  }, [q.data, id, tickFn, qc]);

  if (!q.data) {
    return (
      <ModalShell title="Batch" onClose={onClose}>
        <div className="text-sm text-muted-foreground">Loading…</div>
      </ModalShell>
    );
  }
  const { job, items } = q.data;
  return (
    <ModalShell title={job.name} onClose={onClose}>
      <div className="flex items-center gap-3 mb-4">
        <StatusPill status={job.status} />
        <div className="text-xs text-muted-foreground">
          {job.completed}/{job.total} done{job.failed > 0 && ` · ${job.failed} failed`}
        </div>
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="rounded-xl border border-border/60 bg-elevated/40 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">#{it.position + 1}</span>
              <StatusPill status={it.status} />
            </div>
            <div className="text-sm line-clamp-2">{it.prompt}</div>
            {it.status === "done" && it.output_image && (
              <img src={it.output_image} alt="" className="mt-2 rounded-lg max-h-40" />
            )}
            {it.status === "done" && it.output_text && (
              <div className="mt-2 text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">{it.output_text}</div>
            )}
            {it.status === "failed" && it.error && (
              <div className="mt-2 text-xs text-red-400">{it.error}</div>
            )}
            {it.generation_id && (
              <Link to="/library/$id" params={{ id: it.generation_id }} className="mt-2 inline-block text-xs text-accent hover:underline">
                Open in library →
              </Link>
            )}
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function KindBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium transition ${active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
    >
      {icon}
      {children}
    </button>
  );
}
