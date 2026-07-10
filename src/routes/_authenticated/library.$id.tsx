import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  GitBranch,
  Heart,
  Loader2,
  Sparkles,
  Wand2,
  Trash2,
  Copy,
} from "lucide-react";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { AppHeader, AppHeaderLink } from "@/components/AppHeader";
import {
  getGeneration,
  toggleFavorite,
  deleteGeneration,
  saveGeneration,
  type LibraryGeneration,
} from "@/lib/library.functions";
import { generateAiText, generateAiImage } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/library/$id")({
  ssr: false,
  head: () => ({ meta: [{ title: "Generation — Zentry Qor" }] }),
  component: LibraryDetail,
});

function LibraryDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchOne = useServerFn(getGeneration);
  const favFn = useServerFn(toggleFavorite);
  const delFn = useServerFn(deleteGeneration);
  const save = useServerFn(saveGeneration);
  const runText = useServerFn(generateAiText);
  const runImage = useServerFn(generateAiImage);

  const { data, isLoading } = useQuery({
    queryKey: ["library-item", id],
    queryFn: () => fetchOne({ data: { id } }),
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");

  useEffect(() => {
    if (data?.item && !selectedId) {
      setSelectedId(data.item.id);
      setEditPrompt(data.item.input ?? data.item.prompt);
    }
  }, [data, selectedId]);

  const versions = data?.versions ?? [];
  const selected = useMemo(
    () => versions.find((v) => v.id === selectedId) ?? data?.item ?? null,
    [versions, selectedId, data],
  );
  const compare = useMemo(
    () => (compareId ? versions.find((v) => v.id === compareId) ?? null : null),
    [versions, compareId],
  );

  const rerunMut = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("No base");
      const newInput = editPrompt.trim();
      if (!newInput) throw new Error("Prompt is empty");
      // Rebuild prompt: for text tools the input was raw user input; system + built prompt live in stored fields
      if (selected.kind === "image") {
        const r = await runImage({
          data: {
            prompt: newInput,
            aspectRatio: (selected.aspect_ratio as any) ?? "16:9",
          },
        });
        if (!r.image) throw new Error(r.error ?? "Image generation failed");
        return { kind: "image" as const, image: r.image, input: newInput };
      }
      const r = await runText({
        data: {
          prompt: newInput,
          system: selected.system_prompt ?? undefined,
        },
      });
      return { kind: "text" as const, text: r.text, input: newInput };
    },
    onSuccess: async (r) => {
      if (!selected) return;
      const saved = await save({
        data: {
          toolId: selected.tool_id,
          toolName: selected.tool_name ?? undefined,
          kind: r.kind,
          prompt: r.input,
          systemPrompt: selected.system_prompt ?? undefined,
          input: r.input,
          outputText: r.kind === "text" ? r.text : undefined,
          outputImage: r.kind === "image" ? r.image : undefined,
          aspectRatio: r.kind === "image" ? selected.aspect_ratio ?? undefined : undefined,
          creditsCost: r.kind === "image" ? 30 : 10,
          parentId: selected.id,
          folderId: selected.folder_id ?? undefined,
        },
      });
      toast.success("New version saved");
      qc.invalidateQueries({ queryKey: ["library-item", id] });
      qc.invalidateQueries({ queryKey: ["library-list"] });
      qc.invalidateQueries({ queryKey: ["ai-credits"] });
      // navigate to the new version's page so the tree centers on it
      navigate({ to: "/library/$id", params: { id: saved.id } });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const favMut = useMutation({
    mutationFn: async (v: { id: string; value: boolean }) => favFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library-item", id] }),
  });

  const delMut = useMutation({
    mutationFn: async () => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      navigate({ to: "/library" });
    },
  });

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <AnimatedOrbs />
      <div className="relative pb-24">
        <AppHeader
          nav={
            <>
              <AppHeaderLink to="/dashboard">Dashboard</AppHeaderLink>
              <AppHeaderLink to="/ai">AI Studio</AppHeaderLink>
              <AppHeaderLink to="/library" active>Library</AppHeaderLink>
            </>
          }
        />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-10">
          <Link
            to="/library"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to library
          </Link>

          {isLoading || !selected ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4 mb-8">
                <div>
                  <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2 flex items-center gap-2">
                    <Wand2 className="h-3 w-3 text-accent" />
                    {selected.tool_name ?? selected.tool_id}
                    <span>·</span>
                    <span>{versions.length} version{versions.length === 1 ? "" : "s"}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] line-clamp-2 max-w-2xl">
                    {selected.input ?? selected.prompt}
                  </h1>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => favMut.mutate({ id: selected.id, value: !selected.is_favorite })}
                    className={`h-9 w-9 rounded-xl border border-border/60 bg-elevated/40 flex items-center justify-center ${
                      selected.is_favorite ? "text-rose-400" : "text-muted-foreground hover:text-foreground"
                    }`}
                    aria-label="Favorite"
                  >
                    <Heart className={`h-4 w-4 ${selected.is_favorite ? "fill-current" : ""}`} />
                  </button>
                  <button
                    onClick={() => { if (confirm("Delete this version?")) delMut.mutate(); }}
                    className="h-9 w-9 rounded-xl border border-border/60 bg-elevated/40 flex items-center justify-center text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
                {/* Version tree */}
                <aside>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3 px-1 flex items-center gap-1.5">
                    <GitBranch className="h-3 w-3" /> Version history
                  </div>
                  <div className="space-y-1">
                    {versions.map((v, i) => (
                      <VersionRow
                        key={v.id}
                        v={v}
                        index={i}
                        active={v.id === selected.id}
                        compareActive={v.id === compareId}
                        onSelect={() => setSelectedId(v.id)}
                        onCompare={() =>
                          setCompareId((cur) => (cur === v.id ? null : v.id))
                        }
                      />
                    ))}
                  </div>
                </aside>

                {/* Prompt + Output */}
                <div className="space-y-6">
                  {/* Prompt edit */}
                  <div className="rounded-2xl bg-elevated/40 border border-border/60 p-5">
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                      Prompt (edit to create a new version)
                    </div>
                    <textarea
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      rows={3}
                      className="w-full bg-background/40 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-[11px] text-muted-foreground">
                        Costs {selected.kind === "image" ? 30 : 10} credits · linked as a child of this version
                      </div>
                      <button
                        onClick={() => rerunMut.mutate()}
                        disabled={rerunMut.isPending || !editPrompt.trim()}
                        className="h-9 px-4 rounded-xl bg-foreground text-background text-xs font-medium magnetic glow-primary flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {rerunMut.isPending ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" /> Generating
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3" /> Regenerate
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Output(s) side-by-side if comparing */}
                  <div
                    className={`grid gap-4 ${
                      compare ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
                    }`}
                  >
                    <OutputPanel version={selected} label={compare ? "Selected" : "Output"} />
                    {compare && <OutputPanel version={compare} label="Comparing" />}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function VersionRow({
  v,
  index,
  active,
  compareActive,
  onSelect,
  onCompare,
}: {
  v: LibraryGeneration;
  index: number;
  active: boolean;
  compareActive: boolean;
  onSelect: () => void;
  onCompare: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-1 rounded-xl border transition ${
        active ? "bg-elevated/70 border-border/70" : "border-transparent hover:bg-white/[0.04]"
      }`}
    >
      <button onClick={onSelect} className="flex-1 text-left px-3 py-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          v{index + 1} · {new Date(v.created_at).toLocaleDateString()}
        </div>
        <div className="text-xs line-clamp-1 mt-0.5">{v.input ?? v.prompt}</div>
      </button>
      <button
        onClick={onCompare}
        className={`opacity-0 group-hover:opacity-100 mr-1 h-7 px-2 rounded-md text-[10px] transition ${
          compareActive
            ? "bg-accent/20 text-accent opacity-100"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Compare with selected"
      >
        {compareActive ? "×" : "vs"}
      </button>
    </div>
  );
}

function OutputPanel({ version, label }: { version: LibraryGeneration; label: string }) {
  return (
    <div className="rounded-2xl bg-elevated/40 border border-border/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60">
        <div className="text-xs uppercase tracking-[0.2em] text-accent">{label}</div>
        <div className="text-[10px] text-muted-foreground flex items-center gap-2">
          <span>{new Date(version.created_at).toLocaleString()}</span>
          {version.kind === "text" && version.output_text && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(version.output_text ?? "");
                toast.success("Copied");
              }}
              className="hover:text-foreground"
              aria-label="Copy"
            >
              <Copy className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      {version.kind === "image" && version.output_image ? (
        <img src={version.output_image} alt={version.prompt} className="w-full" />
      ) : (
        <div className="p-5 prose prose-sm prose-invert max-w-none">
          <ReactMarkdown>{version.output_text ?? ""}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
