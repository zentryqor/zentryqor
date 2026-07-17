import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Terminal, Link as LinkIcon } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mcp")({
  head: () => ({
    meta: [
      { title: "Connect MCP — Zentry Qor" },
      { name: "description", content: "Connect Claude, ChatGPT, Cursor, or any MCP-compatible AI client to your Zentry Qor account." },
    ],
  }),
  component: McpPage,
});

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          toast.success("Copied");
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Could not copy");
        }
      }}
      className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10 transition"
      aria-label="Copy"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/60 p-4 text-xs text-foreground/90 font-mono">
        <code>{code}</code>
      </pre>
      <div className="absolute top-2 right-2">
        <CopyBtn text={code} />
      </div>
    </div>
  );
}

function McpPage() {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://zentryqor.lovable.app";
  const mcpUrl = `${origin}/mcp`;
  const serverName = "zentry-qor";

  const npxCommand = useMemo(
    () => `npx -y mcp-remote ${mcpUrl}`,
    [mcpUrl],
  );

  const claudeConfig = useMemo(
    () =>
      JSON.stringify(
        {
          mcpServers: {
            [serverName]: {
              command: "npx",
              args: ["-y", "mcp-remote", mcpUrl],
            },
          },
        },
        null,
        2,
      ),
    [mcpUrl],
  );

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto py-10 px-4 space-y-8">
        <header className="space-y-2">
          <p className="text-[11px] tracking-[0.22em] text-muted-foreground uppercase">Integrations</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Connect Zentry Qor to your AI</h1>
          <p className="text-muted-foreground max-w-2xl">
            Use Zentry Qor's tools directly from Claude, ChatGPT, Cursor, Codex, and any other MCP-compatible AI client. Sign in once through your Zentry Qor account — the client acts as you.
          </p>
        </header>

        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-base">Your MCP server</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">Server name</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input readOnly value={serverName} className="font-mono text-sm" />
                  <CopyBtn text={serverName} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Server URL</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input readOnly value={mcpUrl} className="font-mono text-sm" />
                  <CopyBtn text={mcpUrl} />
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              First time connecting from a client, a browser window will open asking you to sign in to Zentry Qor and approve access. After that the client can call your tools directly.
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="terminal" className="space-y-4">
          <TabsList className="grid grid-cols-2 w-full max-w-sm">
            <TabsTrigger value="terminal" className="gap-2">
              <Terminal className="w-4 h-4" /> Terminal (npx)
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <LinkIcon className="w-4 h-4" /> Manual URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="terminal" className="space-y-6">
            <Card className="border-white/10 bg-white/[0.03]">
              <CardHeader>
                <CardTitle className="text-base">Claude Desktop, Cursor, Codex CLI</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  These clients don't natively support remote MCP over HTTP yet, so use <span className="font-mono">mcp-remote</span> as a local bridge. Add this block to your client's MCP config (e.g. <span className="font-mono">claude_desktop_config.json</span>):
                </p>
                <CodeBlock code={claudeConfig} />
                <p className="text-sm text-muted-foreground">
                  Or run the bridge manually to test the connection:
                </p>
                <CodeBlock code={npxCommand} />
                <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-5">
                  <li>Requires Node.js 18+ installed locally.</li>
                  <li>Restart the client after editing the config.</li>
                  <li>A browser opens for sign-in on the first run.</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="space-y-6">
            <Card className="border-white/10 bg-white/[0.03]">
              <CardHeader>
                <CardTitle className="text-base">ChatGPT, custom clients, remote MCP</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  For clients that support remote MCP servers natively, add a new connector using the fields below.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input readOnly value="Zentry Qor" className="text-sm" />
                      <CopyBtn text="Zentry Qor" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Transport</Label>
                    <Input readOnly value="Streamable HTTP" className="mt-1 text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Server URL</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input readOnly value={mcpUrl} className="font-mono text-sm" />
                      <CopyBtn text={mcpUrl} />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Authentication</Label>
                    <Input readOnly value="OAuth 2.1 (auto)" className="mt-1 text-sm" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Zentry Qor supports dynamic client registration, so most modern clients (ChatGPT, Claude web, MCP Inspector) will discover the OAuth flow automatically.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-base">Available tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium">get_credits</div>
                <div className="text-muted-foreground text-xs">See your remaining AI credits, daily limit, and plan.</div>
              </div>
              <span className="text-[11px] rounded-full bg-white/10 px-2 py-0.5">free</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium">generate_text</div>
                <div className="text-muted-foreground text-xs">Run an AI text prompt with optional system instructions.</div>
              </div>
              <span className="text-[11px] rounded-full bg-primary/20 text-primary px-2 py-0.5">10 credits</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium">generate_image</div>
                <div className="text-muted-foreground text-xs">Generate an image at 16:9, 9:16, 4:3, or 3:4.</div>
              </div>
              <span className="text-[11px] rounded-full bg-primary/20 text-primary px-2 py-0.5">30 credits</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
