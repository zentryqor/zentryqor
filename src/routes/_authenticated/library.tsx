import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  FolderPlus,
  Folder,
  FolderHeart,
  Heart,
  Image as ImageIcon,
  FileText,
  Trash2,
  Star,
  Plus,
  Sparkles,
} from "lucide-react";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { AppHeader, AppHeaderLink } from "@/components/AppHeader";
import {
  listFolders,
  createFolder,
  deleteFolder,
  listGenerations,
  toggleFavorite,
  deleteGeneration,
  moveGeneration,
  type LibraryGeneration,
} from "@/lib/library.functions";

export const Route = createFileRoute("/_authenticated/library")({
  ssr: false,
  head: () => ({ meta: [{ title: "Library — Zentry Qor" }] }),
  component: LibraryPage,
});

type Filter =
  | { type: "all" }
  | { type: "favorites" }
  | { type: "unfiled" }
  | { type: "folder"; id: string };

function LibraryPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>({ type: "all" });
  const [newFolder, setNewFolder] = useState("");
  const [showNew, setShowNew] = useState(false);

  const fetchFolders = useServerFn(listFolders);
  const fetchList = useServerFn(listGenerations);
  const addFolder = useServerFn(createFolder);
  const rmFolder = useServerFn(deleteFolder);
  const favFn = useServerFn(toggleFavorite);
  const delFn = useServerFn(deleteGeneration);
  const moveFn = useServerFn(moveGeneration);

  const folders = useQuery({ queryKey: ["library-folders"], queryFn: () => fetchFolders() });

  const listArgs =
    filter.type === "favorites"
      ? { favoritesOnly: true }
      : filter.type === "unfiled"
        ? { folderId: null as string | null }
        : filter.type === "folder"
          ? { folderId: filter.id }
          : {};

  const items = useQuery({
    queryKey: ["library-list", filter],
    queryFn: () => fetchList({ data: listArgs }),
  });

  const addFolderMut = useMutation({
    mutationFn: async (name: string) => addFolder({ data: { name } }),
    onSuccess: () => {
      setNewFolder("");
      setShowNew(false);
      qc.invalidateQueries({ queryKey: ["library-folders"] });
      toast.success("Folder created");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const rmFolderMut = useMutation({
    mutationFn: async (id: string) => rmFolder({ data: { id } }),
    onSuccess: () => {
      setFilter({ type: "all" });
      qc.invalidateQueries({ queryKey: ["library-folders"] });
      qc.invalidateQueries({ queryKey: ["library-list"] });
    },
  });

  const favMut = useMutation({
    mutationFn: async (v: { id: string; value: boolean }) => favFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library-list"] }),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library-list"] });
      toast.success("Deleted");
    },
  });

  const moveMut = useMutation({
    mutationFn: async (v: { id: string; folderId: string | null }) => moveFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library-list"] }),
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

        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-10">
          <div className="mb-10">
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3 flex items-center gap-1.5">
              <FolderHeart className="h-3 w-3 text-rose-400" /> My Library
            </div>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em]">
              Your saved <span className="text-gradient-brand">generations</span>.
            </h1>
            <p className="text-sm text-muted-foreground mt-3 max-w-xl">
              Every AI output is auto-saved here. Organize into folders, favorite the winners, and track prompt versions over time.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
            {/* Sidebar */}
            <aside className="space-y-1">
              <SidebarButton
                active={filter.type === "all"}
                onClick={() => setFilter({ type: "all" })}
                icon={<Sparkles className="h-3.5 w-3.5" />}
                label="All"
              />
              <SidebarButton
                active={filter.type === "favorites"}
                onClick={() => setFilter({ type: "favorites" })}
                icon={<Heart className="h-3.5 w-3.5 text-rose-400" />}
                label="Favorites"
              />
              <SidebarButton
                active={filter.type === "unfiled"}
                onClick={() => setFilter({ type: "unfiled" })}
                icon={<Folder className="h-3.5 w-3.5 text-muted-foreground" />}
                label="Unfiled"
              />

              <div className="pt-4 pb-1 px-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Folders
              </div>
              {(folders.data ?? []).map((f) => (
                <div key={f.id} className="group flex items-center gap-1">
                  <SidebarButton
                    active={filter.type === "folder" && filter.id === f.id}
                    onClick={() => setFilter({ type: "folder", id: f.id })}
                    icon={<Folder className="h-3.5 w-3.5 text-accent" />}
                    label={f.name}
                  />
                  <button
                    onClick={() => {
                      if (confirm(`Delete folder "${f.name}"? Items become unfiled.`)) rmFolderMut.mutate(f.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 transition"
                    aria-label="Delete folder"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {showNew ? (
                <form
                  className="flex items-center gap-1 mt-2 px-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newFolder.trim()) addFolderMut.mutate(newFolder.trim());
                  }}
                >
                  <input
                    autoFocus
                    value={newFolder}
                    onChange={(e) => setNewFolder(e.target.value)}
                    placeholder="Folder name"
                    className="flex-1 h-8 rounded-lg bg-elevated/40 border border-border/60 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    className="h-8 px-2 rounded-lg bg-foreground text-background text-xs"
                  >
                    Add
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowNew(true)}
                  className="mt-2 w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition"
                >
                  <FolderPlus className="h-3.5 w-3.5" /> New folder
                </button>
              )}
            </aside>

            {/* Grid */}
            <div>
              {items.isLoading ? (
                <div className="text-sm text-muted-foreground p-8">Loading…</div>
              ) : (items.data ?? []).length === 0 ? (
                <EmptyState />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {(items.data ?? []).map((g) => (
                    <GenerationCard
                      key={g.id}
                      item={g}
                      folders={folders.data ?? []}
                      onFavorite={(v) => favMut.mutate({ id: g.id, value: v })}
                      onDelete={() => {
                        if (confirm("Delete this generation?")) delMut.mutate(g.id);
                      }}
                      onMove={(fid) => moveMut.mutate({ id: g.id, folderId: fid })}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
        active
          ? "bg-elevated/70 border border-border/70 text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent"
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-border/60 bg-elevated/30 p-12 text-center">
      <Sparkles className="h-8 w-8 text-accent mx-auto mb-4" />
      <div className="text-lg font-medium">Nothing here yet</div>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
        Head to AI Studio and run any tool — outputs land here automatically.
      </p>
      <Link
        to="/ai"
        className="mt-6 inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-foreground text-background text-sm font-medium"
      >
        Open AI Studio
      </Link>
    </div>
  );
}

function GenerationCard({
  item,
  folders,
  onFavorite,
  onDelete,
  onMove,
}: {
  item: LibraryGeneration;
  folders: Array<{ id: string; name: string }>;
  onFavorite: (v: boolean) => void;
  onDelete: () => void;
  onMove: (folderId: string | null) => void;
}) {
  const KindIcon = item.kind === "image" ? ImageIcon : FileText;
  return (
    <div className="group relative rounded-2xl bg-elevated/40 border border-border/60 overflow-hidden hover:border-foreground/30 transition">
      <Link
        to="/library/$id"
        params={{ id: item.id }}
        className="block"
      >
        {item.kind === "image" && item.output_image ? (
          <img
            src={item.output_image}
            alt={item.prompt}
            className="w-full aspect-[16/9] object-cover"
          />
        ) : (
          <div className="w-full aspect-[16/9] p-4 text-xs text-muted-foreground overflow-hidden bg-gradient-to-br from-elevated/60 to-background line-clamp-6">
            {item.output_text?.slice(0, 240) ?? ""}
          </div>
        )}
        <div className="p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
            <KindIcon className="h-3 w-3" />
            {item.tool_name ?? item.tool_id}
            {item.parent_id && <span className="text-accent">· v2+</span>}
          </div>
          <div className="text-sm line-clamp-2">{item.input ?? item.prompt}</div>
        </div>
      </Link>
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
        <button
          onClick={() => onFavorite(!item.is_favorite)}
          className={`h-8 w-8 rounded-lg backdrop-blur bg-background/70 border border-border/60 flex items-center justify-center ${
            item.is_favorite ? "text-rose-400" : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="Favorite"
        >
          <Heart className={`h-3.5 w-3.5 ${item.is_favorite ? "fill-current" : ""}`} />
        </button>
        <select
          value={item.folder_id ?? ""}
          onChange={(e) => onMove(e.target.value || null)}
          className="h-8 rounded-lg bg-background/70 border border-border/60 text-xs px-1"
          aria-label="Move to folder"
        >
          <option value="">Unfiled</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <button
          onClick={onDelete}
          className="h-8 w-8 rounded-lg backdrop-blur bg-background/70 border border-border/60 flex items-center justify-center text-muted-foreground hover:text-destructive"
          aria-label="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {item.is_favorite && (
        <div className="absolute top-2 left-2 h-6 w-6 rounded-lg backdrop-blur bg-background/70 border border-border/60 flex items-center justify-center text-rose-400">
          <Star className="h-3 w-3 fill-current" />
        </div>
      )}
    </div>
  );
}
