import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Activity, ArrowLeft, BookOpen, Copy, Key, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { ProfileMenu } from "@/components/ProfileMenu";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/api-keys.functions";

export const Route = createFileRoute("/_authenticated/api-keys")({
  head: () => ({
    meta: [
      { title: "API Keys — Zentry Qor" },
      {
        name: "description",
        content:
          "Create Premium API keys to call Zentry Qor's AI tools from your own apps, scripts, and workflows.",
      },
    ],
  }),
  component: ApiKeysPage,
});

function ApiKeysPage() {
  const { user } = useAuth();
  const { isPremium } = useSubscription(user?.id);
  const qc = useQueryClient();
  const list = useServerFn(listApiKeys);
  const create = useServerFn(createApiKey);
  const revoke = useServerFn(revokeApiKey);

  const keysQuery = useQuery({ queryKey: ["api-keys"], queryFn: () => list() });
  const [newName, setNewName] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: async () => create({ data: { name: newName.trim() } }),
    onSuccess: (res) => {
      setFreshKey(res.key);
      setNewName("");
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key created");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create key"),
  });

  const revokeMut = useMutation({
    mutationFn: async (id: string) => revoke({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("Key revoked");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to revoke"),
  });

  const activeKeys = (keysQuery.data ?? []).filter((k) => !k.revoked_at);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <AnimatedOrbs />
      <AppHeader right={<ProfileMenu />} />

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-24">
        <Link to="/settings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to settings
        </Link>

        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl glass-strong flex items-center justify-center shrink-0">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Premium AI API</h1>
            <p className="text-muted-foreground mt-1 max-w-xl">
              Use Zentry Qor's AI tools from your own apps, scripts, or automations. Each request
              spends credits from your daily Premium allowance.
            </p>
          </div>
        </div>

        {!isPremium && (
          <div className="glass-strong rounded-2xl p-6 mb-8 flex items-start gap-4">
            <Sparkles className="w-5 h-5 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-medium">API access is a Premium feature</div>
              <p className="text-sm text-muted-foreground mt-1">
                Upgrade to Premium to generate API keys and get 1,000 credits per day.
              </p>
            </div>
            <Link
              to="/billing"
              className="rounded-xl bg-white text-black px-4 py-2 text-sm font-medium hover:bg-white/90 transition-colors"
            >
              Upgrade
            </Link>
          </div>
        )}

        {/* Create new key */}
        <section className="glass-strong rounded-2xl p-6 mb-8">
          <h2 className="font-medium mb-4">Create a new key</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={!isPremium || createMut.isPending}
              placeholder="e.g. My Zapier workflow"
              maxLength={60}
              className="flex-1 rounded-xl bg-background/40 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-white/30 disabled:opacity-50"
            />
            <button
              onClick={() => createMut.mutate()}
              disabled={!isPremium || !newName.trim() || createMut.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-black px-4 py-2.5 text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Generate key
            </button>
          </div>

          {freshKey && (
            <div className="mt-5 rounded-xl border border-white/15 bg-black/40 p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Copy this key now — it won't be shown again
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-xs sm:text-sm break-all">{freshKey}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(freshKey);
                    toast.success("Copied");
                  }}
                  className="rounded-lg glass-strong px-3 py-2 text-xs inline-flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
                <button
                  onClick={() => setFreshKey(null)}
                  className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Existing keys */}
        <section className="glass-strong rounded-2xl p-6 mb-8">
          <h2 className="font-medium mb-4">Your keys</h2>
          {keysQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : activeKeys.length === 0 ? (
            <div className="text-sm text-muted-foreground">No active API keys yet.</div>
          ) : (
            <ul className="divide-y divide-white/5">
              {activeKeys.map((k) => (
                <li key={k.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{k.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {k.key_prefix}…
                      <span className="ml-2">
                        {k.last_used_at
                          ? `last used ${new Date(k.last_used_at).toLocaleDateString()}`
                          : "never used"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Revoke "${k.name}"? Apps using it will stop working.`)) {
                        revokeMut.mutate(k.id);
                      }
                    }}
                    disabled={revokeMut.isPending}
                    className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-red-400 inline-flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Docs */}
        <section className="glass-strong rounded-2xl p-6">
          <h2 className="font-medium mb-1">Quick start</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Base URL: <code className="font-mono text-xs">https://zentryqor.lovable.app/api/public/v1</code>
          </p>

          <div className="space-y-5 text-sm">
            <Endpoint
              method="POST"
              path="/text"
              cost="10 credits"
              example={`curl https://zentryqor.lovable.app/api/public/v1/text \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Write a TikTok hook about morning routines"}'`}
            />
            <Endpoint
              method="POST"
              path="/image"
              cost="30 credits"
              example={`curl https://zentryqor.lovable.app/api/public/v1/image \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Cinematic thumbnail of a spaceship", "aspect_ratio": "16:9"}'`}
            />
            <Endpoint
              method="GET"
              path="/credits"
              cost="free"
              example={`curl https://zentryqor.lovable.app/api/public/v1/credits \\
  -H "Authorization: Bearer YOUR_KEY"`}
            />
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            Premium plan includes 1,000 credits/day. Rate limits: 30 text + 15 image requests per minute.
          </p>
        </section>
      </main>
    </div>
  );
}

function Endpoint({
  method,
  path,
  cost,
  example,
}: {
  method: string;
  path: string;
  cost: string;
  example: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-mono">{method}</span>
        <code className="font-mono text-xs">{path}</code>
        <span className="ml-auto text-xs text-muted-foreground">{cost}</span>
      </div>
      <pre className="rounded-xl bg-black/50 border border-white/10 p-3 text-xs overflow-x-auto font-mono leading-relaxed">
        {example}
      </pre>
    </div>
  );
}
