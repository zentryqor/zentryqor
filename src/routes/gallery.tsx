import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ImageIcon, Type, Sparkles } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { listPublicGallery } from "@/lib/gallery.functions";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Community Gallery — AI creations by Zentry Qor users" },
      { name: "description", content: "Browse AI-generated images and text shared by the Zentry Qor community. Get inspired, remix ideas, create your own." },
      { property: "og:title", content: "Community Gallery — Zentry Qor" },
      { property: "og:description", content: "AI creations shared by the Zentry Qor community." },
    ],
  }),
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery({
      queryKey: ["gallery-list"],
      queryFn: () => listPublicGallery({ data: { limit: 30 } }),
    });
  },
  component: GalleryPage,
});

type Filter = "all" | "image" | "text";

function GalleryPage() {
  const fetchList = useServerFn(listPublicGallery);
  const q = useQuery({
    queryKey: ["gallery-list"],
    queryFn: () => fetchList({ data: { limit: 30 } }),
  });
  const [filter, setFilter] = useState<Filter>("all");

  const items = q.data ?? [];
  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.kind === filter)),
    [items, filter],
  );

  const imageCount = items.filter((i) => i.kind === "image").length;
  const textCount = items.filter((i) => i.kind === "text").length;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />

      {/* Editorial hero */}
      <header className="relative pt-28 sm:pt-32 pb-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-8"
            >
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-semibold tracking-[-0.04em] leading-[0.95]">
                Made with a<br />
                <span className="italic font-light text-gradient pb-2 inline-block leading-[1.1]">
                  prompt.
                </span>
              </h1>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-4 lg:pb-4"
            >
              <p className="text-[15px] text-muted-foreground leading-relaxed max-w-sm">
                A living feed of work shipped by the Zentry Qor community.
                Every tile started as a single line of text.
              </p>
              <Link
                to="/ai"
                className="group mt-6 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-90 transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Open AI Studio
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </motion.div>
          </div>

          {/* Filter + stats row */}
          <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-6">
            <div className="flex items-center gap-1.5">
              <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
                All <span className="text-muted-foreground ml-1">{items.length}</span>
              </FilterChip>
              <FilterChip active={filter === "image"} onClick={() => setFilter("image")}>
                <ImageIcon className="h-3 w-3" /> Images
                <span className="text-muted-foreground ml-1">{imageCount}</span>
              </FilterChip>
              <FilterChip active={filter === "text"} onClick={() => setFilter("text")}>
                <Type className="h-3 w-3" /> Text
                <span className="text-muted-foreground ml-1">{textCount}</span>
              </FilterChip>
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {filtered.length.toString().padStart(3, "0")} pieces
            </div>
          </div>
        </div>
      </header>

      {/* Masonry feed */}
      <main className="px-4 sm:px-6 pb-24">
        <div className="max-w-7xl mx-auto">
          {q.isLoading ? (
            <SkeletonGrid />
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
              {filtered.map((item, i) => (
                <GalleryTile key={item.id} item={item} index={i} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition border ${
        active
          ? "bg-foreground text-background border-foreground"
          : "border-border/70 text-muted-foreground hover:text-foreground hover:border-foreground/40"
      }`}
    >
      {children}
    </button>
  );
}

function GalleryTile({
  item,
  index,
}: {
  item: {
    id: string;
    kind: "text" | "image";
    prompt: string;
    image_url: string | null;
    output_text: string | null;
    title: string | null;
  };
  index: number;
}) {
  const isImage = item.kind === "image" && item.image_url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] }}
      className="mb-4 break-inside-avoid"
    >
      <Link
        to="/gallery/$id"
        params={{ id: item.id }}
        className="group block relative overflow-hidden rounded-2xl border border-border/60 bg-elevated/40 hover:border-foreground/30 transition-colors"
      >
        {isImage ? (
          <div className="relative">
            <img
              src={item.image_url!}
              alt={item.title || item.prompt}
              className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-x-0 bottom-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
              <p className="text-xs text-white/90 line-clamp-2 leading-relaxed">
                {item.prompt}
              </p>
            </div>
            <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur px-2 py-0.5 text-[10px] text-white/90 font-mono">
              <ImageIcon className="h-2.5 w-2.5" /> image
            </div>
          </div>
        ) : (
          <div className="relative p-6 min-h-[220px] flex flex-col justify-between bg-gradient-to-br from-accent/[0.06] via-transparent to-primary/[0.05]">
            <div className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground font-mono w-fit">
              <Type className="h-2.5 w-2.5" /> text
            </div>
            <p className="mt-4 text-[15px] text-foreground/90 leading-relaxed line-clamp-[9]">
              {item.output_text || item.prompt}
            </p>
            <p className="mt-4 text-[11px] text-muted-foreground line-clamp-1 border-t border-border/50 pt-3">
              {item.prompt}
            </p>
          </div>
        )}
      </Link>
    </motion.div>
  );
}

function SkeletonGrid() {
  const heights = [280, 360, 220, 320, 260, 400, 240, 300, 340];
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
      {heights.map((h, i) => (
        <div
          key={i}
          className="mb-4 break-inside-avoid rounded-2xl bg-elevated/40 border border-border/50 animate-pulse"
          style={{ height: h }}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-border/60 bg-elevated/30 p-16 text-center">
      <Sparkles className="h-8 w-8 text-accent mx-auto mb-4" />
      <div className="text-lg font-medium">The feed is quiet</div>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
        No public creations match this filter yet. Be the first to share one.
      </p>
      <Link
        to="/ai"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-90"
      >
        Open AI Studio
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
