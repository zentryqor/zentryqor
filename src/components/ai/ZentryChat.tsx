import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowUp, BookOpen, ChevronDown, History, Loader2, Plus, Trash2, Upload, X, Youtube } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { chatWithZentry } from "@/lib/chat.functions";
import { listSocialAccounts } from "@/lib/social.functions";
import {
  deleteChatConversation,
  getChatConversation,
  listChatConversations,
} from "@/lib/chat-history.functions";

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
  const [historyOpen, setHistoryOpen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const send = useServerFn(chatWithZentry);
  const listConversations = useServerFn(listChatConversations);
  const loadConversation = useServerFn(getChatConversation);
  const removeConversation = useServerFn(deleteChatConversation);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { chat: conversationId } = useSearch({ strict: false }) as { chat?: string };

  const listAccounts = useServerFn(listSocialAccounts);
  const accounts = useQuery({
    queryKey: ["social-accounts"],
    queryFn: () => listAccounts(),
  });

  const channels = useMemo(
    () =>
      (accounts.data ?? []).filter((a) => a.platform === "youtube" && !a.revoked_at),
    [accounts.data],
  );

  const channelContext = useMemo(() => {
    if (channels.length === 0) return undefined;
    return channels
      .map((c) => {
        const meta = (c.meta ?? {}) as Record<string, any>;
        const bits = [
          `Channel: ${meta.title ?? c.handle ?? "YouTube channel"}`,
          meta.customUrl ? `Handle: ${meta.customUrl}` : null,
          meta.subscriberCount ? `Subscribers: ${meta.subscriberCount}` : null,
          meta.videoCount ? `Videos: ${meta.videoCount}` : null,
          meta.viewCount ? `Total views: ${meta.viewCount}` : null,
          meta.description ? `About: ${String(meta.description).slice(0, 240)}` : null,
        ].filter(Boolean);
        return `- ${bits.join(" | ")}`;
      })
      .join("\n")
      .slice(0, 1100);
  }, [channels]);

  const conversations = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: () => listConversations({}),
  });

  const openConversation = (id?: string) => {
    setHistoryOpen(false);
    navigate({ to: ".", search: (prev: any) => ({ ...prev, chat: id }), replace: true });
  };

  // Restore the conversation named in the URL so a reload continues where it left off.
  const activeConversation = useQuery({
    queryKey: ["chat-conversation", conversationId],
    queryFn: () => loadConversation({ data: { id: conversationId! } }),
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    const loaded = activeConversation.data;
    if (loaded) {
      setMessages(loaded.messages.map((m) => ({ role: m.role, content: m.content })));
      setModel(loaded.conversation.model as ChatModel);
    }
  }, [conversationId, activeConversation.data]);

  const del = useMutation({
    mutationFn: (id: string) => removeConversation({ data: { id } }),
    onSuccess: (_r, id) => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      if (id === conversationId) openConversation(undefined);
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not delete conversation"),
  });

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
      return send({ data: { messages: next, model, toolContext, channelContext, conversationId } });
    },
    onSuccess: (r) => {
      setMessages((m) => [...m, { role: "assistant", content: r.text || "…" }]);
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      if (r.conversationId && r.conversationId !== conversationId) {
        navigate({
          to: ".",
          search: (prev: any) => ({ ...prev, chat: r.conversationId }),
          replace: true,
        });
      }
      onCreditsChange?.();
      taRef.current?.focus();
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
    setInput((v) => `${v.replace(/@([\w-]*)$/, "")}@${t.name} `);
    setMentionOpen(false);
    taRef.current?.focus();
  };

  return (
    <div className="relative isolate">
      <div className="relative rounded-3xl border border-white/10 bg-white/[0.035] backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_24px_60px_-24px_rgba(0,0,0,0.8)] border-beam-host">

        {/* Tabs row */}
        <div className="flex items-center gap-3 px-4 sm:px-5 pt-4 pb-3 border-b border-white/[0.07]">
          <button
            type="button"
            onClick={() => setMode("chat")}
            className={`text-sm font-medium transition-colors ${mode === "chat" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Zentry Chat
          </button>
          {tool && (
            <button
              type="button"
              onClick={() => setTool(null)}
              className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[11px] text-primary hover:bg-primary/20 transition-colors"
              title="Clear selected tool"
            >
              @{tool.name.split(" ")[0]}
              <ChevronDown className="h-3 w-3" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setMode("viral")}
            className={`text-sm font-medium transition-colors ${mode === "viral" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Viral Studio
          </button>

          <div className="relative ml-auto">
            <button
              type="button"
              onClick={() => setHistoryOpen((o) => !o)}
              className="liquid-btn h-8 inline-flex items-center gap-1.5 rounded-xl px-2.5 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Saved chats</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {historyOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-[280px] max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-[hsl(240_6%_9%/0.98)] backdrop-blur-xl p-1.5 shadow-2xl">
                {conversations.isLoading && (
                  <div className="px-3 py-2 text-[11px] text-muted-foreground">Loading…</div>
                )}
                {!conversations.isLoading && (conversations.data?.length ?? 0) === 0 && (
                  <div className="px-3 py-2 text-[11px] text-muted-foreground">
                    No saved chats yet — send a message and it saves automatically.
                  </div>
                )}
                {conversations.data?.map((c) => (
                  <div
                    key={c.id}
                    className={`group flex items-center gap-1 rounded-xl px-1 ${c.id === conversationId ? "bg-white/[0.08]" : "hover:bg-white/[0.05]"}`}
                  >
                    <button
                      type="button"
                      onClick={() => openConversation(c.id)}
                      className="flex-1 min-w-0 text-left px-2 py-2"
                    >
                      <div className="truncate text-[13px]">{c.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(c.updatedAt).toLocaleString()}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => del.mutate(c.id)}
                      aria-label={`Delete ${c.title}`}
                      className="h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Transcript */}
        {messages.length > 0 && (
          <div ref={scrollRef} className="max-h-[46vh] overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl bg-primary px-3.5 py-2 text-sm text-primary-foreground whitespace-pre-wrap">
                    {m.content.split(/(@[\w][\w -]*)/g).map((part, j) =>
                      part.startsWith("@") ? (
                        <span key={j} className="font-medium underline decoration-white/40">
                          {part}
                        </span>
                      ) : (
                        <span key={j}>{part}</span>
                      ),
                    )}
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
            <div className="absolute left-4 right-4 bottom-full mb-2 z-50 max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain rounded-2xl border border-primary/25 bg-[hsl(240_6%_9%/0.98)] backdrop-blur-xl p-1.5 shadow-2xl">
              {filteredTools.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pickTool(t)}
                  className="w-full text-left rounded-xl px-3 py-2 hover:bg-primary/10 transition-colors"
                >
                  <div className="text-sm text-primary">@{t.name}</div>
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
            onClick={() => {
              setMessages([]);
              openConversation(undefined);
              taRef.current?.focus();
            }}
            title="New chat"
            className="liquid-btn h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground"
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
            className="liquid-btn h-9 shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 text-xs text-primary"
          >
            <BookOpen className="h-3.5 w-3.5" /> Skill
          </button>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setModelOpen((o) => !o)}
              className="liquid-btn h-9 inline-flex items-center gap-1.5 rounded-xl px-3 text-xs text-foreground"
            >
              {activeModel.label}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {modelOpen && (
              <div className="absolute left-0 bottom-full mb-2 z-50 w-60 max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[hsl(240_6%_9%/0.98)] backdrop-blur-xl p-1.5 shadow-2xl">
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
            <div className="liquid-btn hidden sm:flex items-center gap-1.5 rounded-xl px-3 h-9 text-xs text-muted-foreground max-w-[210px]">
              <span className="text-foreground">Agent</span>
              <span className="opacity-50">·</span>
              <span className="truncate">{activeModel.label}</span>
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={mut.isPending || !input.trim()}
              className="liquid-btn liquid-btn--primary h-9 w-9 shrink-0 rounded-xl text-primary-foreground flex items-center justify-center"
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
