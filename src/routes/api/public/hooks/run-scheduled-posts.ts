import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/run-scheduled-posts")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { runDueScheduledPosts } = await import("@/lib/publish.server");
          const result = await runDueScheduledPosts();
          return Response.json({ ok: true, ...result });
        } catch (e: any) {
          return new Response(
            JSON.stringify({ ok: false, error: String(e?.message ?? e) }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
      GET: async () => Response.json({ ok: true, endpoint: "run-scheduled-posts" }),
    },
  },
});
