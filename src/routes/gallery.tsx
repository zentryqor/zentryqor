import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageShell } from "@/components/PageShell";
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

function GalleryPage() {
  const fetchList = useServerFn(listPublicGallery);
  const q = useQuery({
    queryKey: ["gallery-list"],
    queryFn: () => fetchList({ data: { limit: 30 } }),
  });
  const items = q.data ?? [];

  return (
    <PageShell
      eyebrow="Gallery"
      title="Community showcase"
      description="AI creations shared by the Zentry Qor community. Every image and post here started with a prompt."
    >
      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No public creations yet. Be the first!</p>
          <Link
            to="/ai"
            className="inline-flex items-center gap-2 mt-6 rounded-full bg-white text-black px-5 py-2.5 text-sm font-medium hover:bg-white/90"
          >
            Open AI Studio
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Link
              key={item.id}
              to="/gallery/$id"
              params={{ id: item.id }}
              className="group glass-strong rounded-2xl overflow-hidden hover:scale-[1.01] transition-transform"
            >
              {item.kind === "image" && item.image_url ? (
                <div className="relative aspect-square">
                  <img
                    src={item.image_url}
                    alt={item.title || item.prompt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute bottom-2 right-2 rounded-full bg-black/70 backdrop-blur px-2.5 py-1 text-[10px] text-white">
                    ✨ Zentry Qor
                  </span>
                </div>
              ) : (
                <div className="aspect-square p-5 flex items-center justify-center bg-gradient-to-br from-white/5 to-white/[0.02]">
                  <p className="text-sm text-foreground/80 line-clamp-6 leading-relaxed">
                    {item.output_text || item.prompt}
                  </p>
                </div>
              )}
              <div className="p-3">
                <p className="text-xs text-muted-foreground line-clamp-2">{item.prompt}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
