import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageShell } from "@/components/PageShell";
import { listTemplates } from "@/lib/templates.functions";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "AI Prompt Templates — Thumbnails, Ads, Posts | Zentry Qor" },
      { name: "description", content: "Ready-to-run AI prompt templates for YouTube thumbnails, Instagram ads, LinkedIn posts, product shots, and more. Free to use." },
      { property: "og:title", content: "AI Prompt Templates — Zentry Qor" },
      { property: "og:description", content: "Pre-built AI prompts for creators, marketers, and founders." },
    ],
  }),
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery({
      queryKey: ["templates-list"],
      queryFn: () => listTemplates(),
    });
  },
  component: TemplatesPage,
});

function TemplatesPage() {
  const fetchList = useServerFn(listTemplates);
  const q = useQuery({ queryKey: ["templates-list"], queryFn: () => fetchList() });
  const templates = q.data ?? [];

  const byCategory: Record<string, typeof templates> = {};
  for (const t of templates) {
    (byCategory[t.category] ??= []).push(t);
  }

  return (
    <PageShell
      eyebrow="Templates"
      title="Prompt template library"
      description="Battle-tested AI prompts for the outputs creators actually ship. Pick one, tweak the placeholders, generate in seconds."
    >
      {Object.entries(byCategory).map(([category, list]) => (
        <section key={category} className="mb-12">
          <h2 className="text-xs uppercase tracking-[0.22em] text-accent mb-4">{category}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {list.map((t) => (
              <Link
                key={t.slug}
                to="/templates/$slug"
                params={{ slug: t.slug }}
                className="group glass-strong rounded-2xl p-5 hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{t.title}</h3>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground rounded-full bg-white/5 px-2 py-0.5">
                    {t.kind}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.description}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {templates.length === 0 && (
        <div className="text-center py-16 text-sm text-muted-foreground">Loading templates…</div>
      )}
    </PageShell>
  );
}
