import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, User } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { getGalleryItem } from "@/lib/gallery.functions";

export const Route = createFileRoute("/gallery/$id")({
  loader: async ({ context, params }) => {
    const item = await context.queryClient.ensureQueryData({
      queryKey: ["gallery-item", params.id],
      queryFn: () => getGalleryItem({ data: { id: params.id } }),
    });
    if (!item) throw notFound();
    return { item };
  },
  head: ({ loaderData }) => {
    const item = loaderData?.item;
    const title = item?.title || item?.prompt.slice(0, 80) || "Gallery — Zentry Qor";
    const desc = item?.prompt.slice(0, 155) || "Created with Zentry Qor AI.";
    return {
      meta: [
        { title: `${title} — Zentry Qor Gallery` },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(item?.image_url
          ? [
              { property: "og:image", content: item.image_url },
              { name: "twitter:card", content: "summary_large_image" },
              { name: "twitter:image", content: item.image_url },
            ]
          : []),
      ],
    };
  },
  errorComponent: () => (
    <PageShell title="Gallery" description="Something went wrong loading this item.">
      <div />
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell title="Not found" description="This gallery item is private or no longer exists.">
      <Link to="/gallery" className="text-sm underline">Browse the gallery</Link>
    </PageShell>
  ),
  component: GalleryItemPage,
});

function GalleryItemPage() {
  const { id } = Route.useParams();
  const fetchItem = useServerFn(getGalleryItem);
  const q = useQuery({
    queryKey: ["gallery-item", id],
    queryFn: () => fetchItem({ data: { id } }),
  });
  const item = q.data;
  if (!item) return null;

  return (
    <PageShell
      eyebrow="Gallery"
      title={item.title || item.prompt.slice(0, 60)}
      description="Created with Zentry Qor"
    >
      <div className="max-w-3xl mx-auto">
        <Link to="/gallery" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to gallery
        </Link>

        {item.kind === "image" && item.image_url && (
          <div className="glass-strong rounded-2xl overflow-hidden mb-6 relative">
            <img src={item.image_url} alt={item.title || item.prompt} className="w-full" />
            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 backdrop-blur px-3 py-1 text-xs text-white">
              ✨ Created with Zentry Qor
            </span>
          </div>
        )}

        {item.kind === "text" && item.output_text && (
          <div className="glass-strong rounded-2xl p-6 mb-6 whitespace-pre-wrap text-[15px] leading-relaxed">
            {item.output_text}
          </div>
        )}

        <div className="glass-strong rounded-2xl p-6 mb-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Prompt</div>
          <div className="text-sm whitespace-pre-wrap">{item.prompt}</div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><User className="w-3 h-3" /> Community creator</span>
          <span>{new Date(item.created_at).toLocaleDateString()}</span>
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/ai"
            className="inline-flex items-center gap-2 rounded-full bg-white text-black px-5 py-2.5 text-sm font-medium hover:bg-white/90"
          >
            Create your own
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
