import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Copy, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { ProfileMenu } from "@/components/ProfileMenu";

export const Route = createFileRoute("/_authenticated/api-docs")({
  head: () => ({
    meta: [
      { title: "API Docs — Zentry Qor" },
      {
        name: "description",
        content:
          "Interactive Zentry Qor API docs. Try /text and /image live in your browser and copy Node or Python code examples.",
      },
    ],
  }),
  component: ApiDocsPage,
});

const BASE_URL = "https://zentryqor.lovable.app/api/public/v1";

type EndpointKey = "text" | "image" | "credits";

const DEFAULT_BODY: Record<EndpointKey, string> = {
  text: JSON.stringify({ prompt: "Write a TikTok hook about morning routines" }, null, 2),
  image: JSON.stringify(
    { prompt: "Cinematic thumbnail of a spaceship over Mars", aspect_ratio: "16:9" },
    null,
    2,
  ),
  credits: "",
};

const ENDPOINT_META: Record<EndpointKey, { method: "GET" | "POST"; path: string; cost: string; blurb: string }> = {
  text: { method: "POST", path: "/text", cost: "10 credits", blurb: "Generate text with an LLM." },
  image: { method: "POST", path: "/image", cost: "30 credits", blurb: "Generate an image and receive a base64 data URL." },
  credits: { method: "GET", path: "/credits", cost: "free", blurb: "Check your remaining daily credits." },
};

function ApiDocsPage() {
  const [apiKey, setApiKey] = useState("");
  const [endpoint, setEndpoint] = useState<EndpointKey>("text");
  const [body, setBody] = useState<string>(DEFAULT_BODY.text);
  const [lang, setLang] = useState<"curl" | "node" | "python">("node");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ status: number; ms: number; body: string } | null>(null);

  const meta = ENDPOINT_META[endpoint];

  function switchEndpoint(next: EndpointKey) {
    setEndpoint(next);
    setBody(DEFAULT_BODY[next]);
    setResult(null);
  }

  async function runRequest() {
    if (!apiKey.trim()) {
      toast.error("Paste your API key first");
      return;
    }
    setRunning(true);
    setResult(null);
    const url = `${BASE_URL}${meta.path}`;
    const started = Date.now();
    try {
      const init: RequestInit = {
        method: meta.method,
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          ...(meta.method === "POST" ? { "Content-Type": "application/json" } : {}),
        },
      };
      if (meta.method === "POST") init.body = body;
      const res = await fetch(url, init);
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {}
      setResult({ status: res.status, ms: Date.now() - started, body: pretty });
    } catch (e: any) {
      setResult({ status: 0, ms: Date.now() - started, body: e?.message ?? "Request failed" });
    } finally {
      setRunning(false);
    }
  }

  const code = useMemo(() => buildSnippet(endpoint, lang, apiKey, body), [endpoint, lang, apiKey, body]);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <AnimatedOrbs />
      <AppHeader right={<ProfileMenu />} />

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-24">
        <Link to="/api-keys" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to API keys
        </Link>

        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl glass-strong flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">API docs</h1>
            <p className="text-muted-foreground mt-1 max-w-xl">
              Base URL:{" "}
              <a
                href={BASE_URL}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs underline hover:text-foreground"
              >
                {BASE_URL}
              </a>
            </p>
          </div>
        </div>

        {/* API key input */}
        <section className="glass-strong rounded-2xl p-5 mb-6">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Your API key</label>
          <div className="mt-2 flex flex-col sm:flex-row gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="zqk_live_..."
              className="flex-1 rounded-xl bg-background/40 border border-white/10 px-4 py-2.5 text-sm font-mono outline-none focus:border-white/30"
            />
            <Link
              to="/api-keys"
              className="rounded-xl glass px-4 py-2.5 text-sm text-center hover:bg-white/[0.06] transition-colors"
            >
              Manage keys
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Used only in your browser to send test requests. Nothing is saved.
          </p>
        </section>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Console */}
          <section className="glass-strong rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium">Try it out</h2>
              <div className="flex items-center gap-1 rounded-lg glass p-1">
                {(Object.keys(ENDPOINT_META) as EndpointKey[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => switchEndpoint(k)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono transition ${
                      endpoint === k ? "bg-white text-black" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {ENDPOINT_META[k].path}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3 text-xs">
              <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono">{meta.method}</span>
              <code className="font-mono text-muted-foreground">{BASE_URL}{meta.path}</code>
              <span className="ml-auto text-muted-foreground">{meta.cost}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{meta.blurb}</p>

            {meta.method === "POST" && (
              <>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Request body</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  className="mt-2 w-full rounded-xl bg-black/50 border border-white/10 p-3 text-xs font-mono outline-none focus:border-white/30"
                />
              </>
            )}

            <button
              onClick={runRequest}
              disabled={running}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white text-black px-4 py-2.5 text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Send request
            </button>

            {result && (
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs ${
                      result.status >= 200 && result.status < 300
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "bg-red-500/10 text-red-300"
                    }`}
                  >
                    {result.status || "network error"}
                  </span>
                  <span className="text-xs text-muted-foreground">{result.ms} ms</span>
                </div>
                <pre className="rounded-xl bg-black/60 border border-white/10 p-3 text-xs overflow-auto max-h-72 font-mono whitespace-pre-wrap break-all">
                  {result.body}
                </pre>
              </div>
            )}
          </section>

          {/* Code examples */}
          <section className="glass-strong rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium">Code example</h2>
              <div className="flex items-center gap-1 rounded-lg glass p-1">
                {(["curl", "node", "python"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-2.5 py-1 rounded-md text-xs transition ${
                      lang === l ? "bg-white text-black" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {l === "curl" ? "cURL" : l === "node" ? "Node.js" : "Python"}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <pre className="rounded-xl bg-black/60 border border-white/10 p-4 text-xs overflow-auto max-h-[28rem] font-mono leading-relaxed">
                {code}
              </pre>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  toast.success("Copied");
                }}
                className="absolute top-2 right-2 rounded-lg glass-strong px-2.5 py-1.5 text-xs inline-flex items-center gap-1.5"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Replace <code className="font-mono">YOUR_KEY</code> with your API key. Node example needs Node 18+
              (built-in fetch). Python example needs <code className="font-mono">requests</code>:
              <code className="font-mono"> pip install requests</code>.
            </p>
          </section>
        </div>

        <section className="glass-strong rounded-2xl p-5 mt-6">
          <h2 className="font-medium mb-2">Response format</h2>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li>
              <span className="font-mono text-xs">200</span> — JSON body with <span className="font-mono text-xs">text</span>,{" "}
              <span className="font-mono text-xs">image</span> (base64 data URL), or credit info.
            </li>
            <li>
              <span className="font-mono text-xs">401</span> — missing or invalid API key.
            </li>
            <li>
              <span className="font-mono text-xs">403</span> — Premium membership required.
            </li>
            <li>
              <span className="font-mono text-xs">429</span> — daily credit or per-minute rate limit hit.
            </li>
            <li>
              <span className="font-mono text-xs">4xx / 5xx</span> — JSON body includes an{" "}
              <span className="font-mono text-xs">error</span> message.
            </li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            Rate limits: 30 text + 15 image requests per minute. 1,000 credits per day on Premium.
          </p>
        </section>
      </main>
    </div>
  );
}

function buildSnippet(endpoint: EndpointKey, lang: "curl" | "node" | "python", apiKey: string, body: string): string {
  const meta = ENDPOINT_META[endpoint];
  const url = `${BASE_URL}${meta.path}`;
  const key = apiKey.trim() || "YOUR_KEY";
  const compactBody = (() => {
    try {
      return JSON.stringify(JSON.parse(body));
    } catch {
      return body;
    }
  })();

  if (lang === "curl") {
    if (meta.method === "GET") {
      return `curl ${url} \\
  -H "Authorization: Bearer ${key}"`;
    }
    return `curl ${url} \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '${compactBody.replace(/'/g, "'\\''")}'`;
  }

  if (lang === "node") {
    if (meta.method === "GET") {
      return `// Node 18+
const res = await fetch("${url}", {
  headers: { Authorization: "Bearer ${key}" },
});
const data = await res.json();
console.log(data);`;
    }
    return `// Node 18+
const res = await fetch("${url}", {
  method: "POST",
  headers: {
    Authorization: "Bearer ${key}",
    "Content-Type": "application/json",
  },
  body: JSON.stringify(${body}),
});
const data = await res.json();
console.log(data);`;
  }

  // python
  if (meta.method === "GET") {
    return `import requests

res = requests.get(
    "${url}",
    headers={"Authorization": "Bearer ${key}"},
)
print(res.status_code, res.json())`;
  }
  return `import requests

res = requests.post(
    "${url}",
    headers={
        "Authorization": "Bearer ${key}",
        "Content-Type": "application/json",
    },
    json=${toPythonLiteral(body)},
)
print(res.status_code, res.json())`;
}

function toPythonLiteral(jsonText: string): string {
  try {
    const val = JSON.parse(jsonText);
    return pyRepr(val, 0);
  } catch {
    return jsonText;
  }
}

function pyRepr(val: unknown, depth: number): string {
  const pad = "    ".repeat(depth);
  const inner = "    ".repeat(depth + 1);
  if (val === null) return "None";
  if (typeof val === "boolean") return val ? "True" : "False";
  if (typeof val === "number") return String(val);
  if (typeof val === "string") return JSON.stringify(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return "[]";
    return `[\n${val.map((v) => `${inner}${pyRepr(v, depth + 1)}`).join(",\n")}\n${pad}]`;
  }
  if (typeof val === "object") {
    const entries = Object.entries(val as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    return `{\n${entries
      .map(([k, v]) => `${inner}${JSON.stringify(k)}: ${pyRepr(v, depth + 1)}`)
      .join(",\n")}\n${pad}}`;
  }
  return "None";
}
