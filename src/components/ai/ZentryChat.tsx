import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowUp, BookOpen, ChevronDown, Loader2, Plus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { chatWithZentry } from "@/lib/chat.functions";

export type ChatTool = {
  id: string;
  name: string;
  tagline: string;
  system: string;
};

type ChatModel = "zentry-qor-flash" | "zentry-qor-basic" | "zentry-qor-pro";

const MODELS: { id: ChatModel; label: string; note: string }[] = [
  { id: "zentry-qor-flash", label: "Zentry Qor Flash", note: "Fastest replies" },
  { id: "zentry-qor-basic", label: "Zentry Qor Basic", note: "Focused and precise" },
  { id: "zentry-qor-pro", label: "Zentry Qor Pro", note: "Longest, most creative" },
];

type Msg = { role: "user" | "assistant"; content: string };

export function ZentryChat({ tools, onCreditsChange }: { tools: ChatTool[]; onCreditsChange?: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<ChatModel>("zentry-qor-flash");
  const [modelOpen, setModelOpen] = useState(false);
  const [mode, setMode] = useState<"chat" | "viral">("chat");
  const [tool, setTool] = useState<ChatTool | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const send = useServerFn(chatWithZentry);

  const activeModel = MODELS.find((m) => m.id === model)!;
  const filteredTools = useMemo(
    () =>
      tools.filter((t) =>
        mentionQuery ? t.name.toLowerCase().includes(mentionQuery.toLowerCase()) : true,
      ),
    [tools, mentionQuery],
  );

  useEffect(() => {
    taRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const mut = useMutation({
    mutationFn: async (next: Msg[]) => {
      const toolContext =
        mode === "viral"
          ? "Focus every answer on virality: hook, retention, posting strategy, and trend hijacking."
          : tool
            ? `${tool.name} — ${tool.tagline}\n${tool.system}`
            : undefined;
      return send({ data: { messages: next, model, toolContext } });
    },
    onSuccess: (r) => {
      setMessages((m) => [...m, { role: "assistant", content: r.text || "…" }]);
      onCreditsChange?.();
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Chat failed");
      onCreditsChange?.();
    },
  });

  const submit = () => {
    const value = input.trim();
    if (!value || mut.isPending) return;
    const next = [...messages, { role: "user" as const, content: value }];
    setMessages(next);
    setInput("");
    setMentionOpen(false);
    mut.mutate(next);
  };

  const onChange = (v: string) => {
    setInput(v);
    const m = v.match(/@([\w-]*)$/);
    if (m) {
      setMentionOpen(true);
      setMentionQuery(m[1]);
    } else {
      setMentionOpen(false);
    }
  };

  const pickTool = (t: ChatTool) => {
    setTool(t);
    setInput((v) => v.replace(/@([\w-]*)$/, ""));
    setMentionOpen(false);
    taRef.current?.focus();
  };

  return (
    <div className="relative">
      {/* Ambient purple glow background, like the reference composer */}
      <div aria-hidden className="pointer-events-none absolute -inset-x-6 -bottom-16 -top-8 overflow-hidden rounded-[40px]">
        <div className="absolute left-1/2 bottom-0 h-64 w-[130%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(60%_100%_at_50%_100%,hsl(268_90%_62%/0.55),transparent_70%)] blur-2xl" />
        <div
          className="absolute inset-x-0 bottom-0 h-40 opacity-30 text-primary"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "linear-gradient(to top, black, transparent)",
            WebkitMaskImage: "linear-gradient(to top, black, transparent)",
          }}
        />
      </div>

      <div className="relative rounded-3xl border border-white/10 bg-[hsl(240_6%_7%/0.92)] backdrop-blur-xl shadow-[0_30px_80px_-30px_hsl(268_90%_50%/0.5)] overflow-hidden">
        {/* Tabs row */}
        <div className="flex items-center gap-3 px-4 sm:px-5 pt-4 pb-3 border-b border-white/[0.07]">
          <button
            type="button"
            onClick={() => setMode("chat")}
            className={`text-sm font-medium transition-colors ${mode === "chat" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Zentry Chat
          </button>
          {tool ? (
            <button
              type="button"
              onClick={() => setTool(null)}
              className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
              title="Clear selected tool"
            >
              {tool.name.split(" ")[0]}
              <ChevronDown className="h-3 w-3" />
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-0.5 text-[11px] text-muted-foreground">
              Canvas
              <ChevronDown className="h-3 w-3" />
            </span>
          )}
          <button
            type="button"
            onClick={() => setMode("viral")}
            className={`text-sm font-medium transition-colors ${mode === "viral" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Viral Studio
          </button>
        </div>

        {/* Transcript */}
        {messages.length > 0 && (
          <div ref={scrollRef} className="max-h-[46vh] overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ),
            )}
            {mut.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
              </div>
            )}
          </div>
        )}

        {/* Composer */}
        <div className="relative px-4 sm:px-5 pt-4">
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={2}
            placeholder="Ask Zentry how to edit, post, or go viral — type @ for tools"
            className="w-full resize-none bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
          />

          {mentionOpen && filteredTools.length > 0 && (
            <div className="absolute left-4 right-4 bottom-full mb-2 z-20 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-[hsl(240_6%_9%/0.98)] backdrop-blur-xl p-1.5 shadow-2xl">
              {filteredTools.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pickTool(t)}
                  className="w-full text-left rounded-xl px-3 py-2 hover:bg-white/[0.06] transition-colors"
                >
                  <div className="text-sm">{t.name}</div>
                  <div className="text-[11px] text-muted-foreground">{t.tagline}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bottom controls */}
        <div className="flex items-center gap-2 px-4 sm:px-5 pb-4 pt-3">
          <button
            type="button"
            onClick={() => setMessages([])}
            title="New chat"
            className="h-9 w-9 shrink-0 rounded-xl border border-white/12 bg-white/[0.03] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/[0.07] transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setInput((v) => (v.endsWith("@") ? v : `${v}@`));
              setMentionOpen(true);
              setMentionQuery("");
              taRef.current?.focus();
            }}
            className="h-9 shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.03] px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.07] transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5" /> Skill
          </button>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setModelOpen((o) => !o)}
              className="h-9 inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.03] px-3 text-xs text-foreground hover:bg-white/[0.07] transition-colors"
            >
              {activeModel.label}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {modelOpen && (
              <div className="absolute left-0 bottom-full mb-2 z-20 w-56 rounded-2xl border border-white/10 bg-[hsl(240_6%_9%/0.98)] backdrop-blur-xl p-1.5 shadow-2xl">
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setModel(m.id);
                      setModelOpen(false);
                    }}
                    className={`w-full text-left rounded-xl px-3 py-2 transition-colors ${m.id === model ? "bg-white/[0.08]" : "hover:bg-white/[0.05]"}`}
                  >
                    <div className="text-sm">{m.label}</div>
                    <div className="text-[11px] text-muted-foreground">{m.note}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 min-w-0">
            <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.03] px-3 h-9 text-xs text-muted-foreground max-w-[210px]">
              <span className="text-foreground">Agent</span>
              <span className="opacity-50">·</span>
              <span className="truncate">{activeModel.label}</span>
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={mut.isPending || !input.trim()}
              className="h-9 w-9 shrink-0 rounded-xl bg-white text-black flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity"
              aria-label="Send message"
            >
              {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 text-center text-[11px] text-muted-foreground">
        {tool ? `Using ${tool.name} · ` : ""}10 credits per reply
      </div>
    </div>
  );
}
