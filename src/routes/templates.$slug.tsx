import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Copy, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { getTemplate } from "@/lib/templates.functions";

export const Route = createFileRoute("/templates/$slug")({
  loader: async ({ context, params }) => {
    const t = await context.queryClient.ensureQueryData({
      queryKey: ["template", params.slug],
      queryFn: () => getTemplate({ data: { slug: params.slug } }),
    });
    if (!t) throw notFound();
    return { template: t };
  },
  head: ({ loaderData }) => {
    const t = loaderData?.template;
    const title = t?.seo_title || `${t?.title ?? "Template"} — Zentry Qor`;
    const desc = t?.seo_description || t?.description || "AI prompt template by Zentry Qor.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  errorComponent: () => (
    <PageShell title="Template" description="Something went wrong.">
      <Link to="/templates" className="underline text-sm">Back to templates</Link>
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell title="Not found" description="This template doesn't exist.">
      <Link to="/templates" className="underline text-sm">Browse templates</Link>
    </PageShell>
  ),
  component: TemplatePage,
});

function TemplatePage() {
  const { slug } = Route.useParams();
  const fetchTemplate = useServerFn(getTemplate);
  const q = useQuery({
    queryKey: ["template", slug],
    queryFn: () => fetchTemplate({ data: { slug } }),
  });
  const t = q.data;
  const [copied, setCopied] = useState(false);

  if (!t) return null;

  return (
    <PageShell eyebrow={t.category} title={t.title} description={t.description}>
      <div className="max-w-2xl mx-auto">
        <Link to="/templates" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> All templates
        </Link>

        <div className="glass-strong rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">Prompt</h2>
            <button
              onClick={() => {
                navigator.clipboard.writeText(t.prompt);
                setCopied(true);
                toast.success("Prompt copied");
                setTimeout(() => setCopied(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5"
            >
              <Copy className="w-3.5 h-3.5" /> {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-sm font-mono text-foreground/90 leading-relaxed">
            {t.prompt}
          </pre>
        </div>

        <div className="glass-strong rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-medium mb-2">How to use</h2>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Replace <code className="bg-white/10 rounded px-1.5 py-0.5 text-xs">[BRACKETED]</code> placeholders with your specifics.</li>
            <li>Open the AI Studio and paste the prompt into the {t.kind === "image" ? "thumbnail" : "matching text"} tool.</li>
            <li>Generate — tweak the wording if the first draft isn't quite right.</li>
          </ol>
        </div>

        <Link
          to="/ai"
          search={{ tool: t.kind === "image" ? "thumbnail" : "captions", prompt: t.prompt } as any}
          className="inline-flex items-center gap-2 rounded-full bg-white text-black px-5 py-2.5 text-sm font-medium hover:bg-white/90"
        >
          <Sparkles className="w-4 h-4" /> Use in AI Studio
        </Link>
      </div>
    </PageShell>
  );
}
