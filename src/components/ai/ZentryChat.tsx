import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowUp, BookOpen, ChevronDown, History, Loader2, Plus, Trash2, Upload, X, Youtube } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { chatWithZentry } from "@/lib/chat.functions";
import { getYouTubeChannelDetails } from "@/lib/youtube-analytics.functions";
import { listSocialAccounts } from "@/lib/social.functions";
import {
  deleteChatConversation,
  getChatConversation,
  listChatConversations,
} from "@/lib/chat-history.functions";
import {
  createChatSkill,
  deleteChatSkill,
  listChatSkills,
} from "@/lib/chat-skills.functions";

/** Parse a SKILL.md file: optional YAML frontmatter (name/description) + markdown body. */
function parseSkillMd(raw: string, fallbackName: string) {
  let name = "";
  let description = "";
  let body = raw.trim();

  const fm = body.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (fm) {
    for (const line of fm[1].split(/\r?\n/)) {
      const m = line.match(/^(name|description)\s*:\s*(.*)$/i);
      if (m) {
        const value = m[2].trim().replace(/^["']|["']$/g, "");
        if (m[1].toLowerCase() === "name") name = value;
        else description = value;
      }
    }
    body = body.slice(fm[0].length).trim();
  }
  if (!name) {
    const h1 = body.match(/^#\s+(.+)$/m);
    name = h1 ? h1[1].trim() : fallbackName;
  }
  if (!description) {
    const firstPara = body
      .split(/\r?\n\r?\n/)
      .map((p) => p.trim())
      .find((p) => p && !p.startsWith("#"));
    description = (firstPara ?? "Custom skill").replace(/\s+/g, " ").slice(0, 160);
  }
  return { name: name.slice(0, 60), description: description.slice(0, 200), content: body };
}

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
  
  const [tool, setTool] = useState<ChatTool | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [skillForm, setSkillForm] = useState({ name: "", description: "", content: "" });
  const fileRef = useRef<HTMLInputElement | null>(null);
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

  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [channelMenuOpen, setChannelMenuOpen] = useState(false);

  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) ?? channels[0] ?? null,
    [channels, activeChannelId],
  );

  const channelLabel = (c: any) => {
    const meta = (c?.meta ?? {}) as Record<string, any>;
    return meta.title ?? c?.handle ?? meta.customUrl ?? "YouTube channel";
  };

  // Live channel stats — the cached `meta` on the account row goes stale fast,
  // which made the assistant quote wrong subscriber/view counts.
  const fetchChannelDetails = useServerFn(getYouTubeChannelDetails);
  const channelDetails = useQuery({
    queryKey: ["chat-channel-details", activeChannel?.id],
    queryFn: () => fetchChannelDetails({ data: { accountId: activeChannel!.id } }),
    enabled: !!activeChannel,
    staleTime: 60_000,
    retry: false,
  });

  const channelContext = useMemo(() => {
    const d = channelDetails.data;
    if (!d) return undefined;
    const top = d.recentVideos
      .slice(0, 5)
      .map(
        (v) =>
          `"${v.title}" (${new Date(v.publishedAt).toISOString().slice(0, 10)}, ${v.views} views, ${v.likes} likes, ${v.comments} comments)`,
      )
      .join("; ");
    return [
      `Channel: ${d.title}`,
      d.customUrl ? `Handle: ${d.customUrl}` : null,
      d.stats.hiddenSubs ? "Subscribers: hidden by the owner" : `Subscribers: ${d.stats.subscribers}`,
      `Total views: ${d.stats.views}`,
      `Videos: ${d.stats.videos}`,
      d.description ? `About: ${d.description.slice(0, 200)}` : null,
      top ? `Recent uploads: ${top}` : null,
      "These figures are live from the YouTube Data API. Use only these numbers; never estimate or invent metrics, and say you don't have the data if it is not listed here.",
    ]
      .filter(Boolean)
      .join(" | ")
      .slice(0, 1200);
  }, [channelDetails.data]);

  const insertChannelMention = () => {
    if (!activeChannel) return;
    const name = channelLabel(activeChannel);
    setInput((v) => `${v.trimEnd()}${v.trim() ? " " : ""}/${name} `.replace(/^\s+/, ""));
    taRef.current?.focus();
  };


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

  const fetchSkills = useServerFn(listChatSkills);
  const addSkill = useServerFn(createChatSkill);
  const removeSkill = useServerFn(deleteChatSkill);

  const customSkills = useQuery({
    queryKey: ["chat-skills"],
    queryFn: () => fetchSkills(),
  });

  const saveSkill = useMutation({
    mutationFn: (payload: { name: string; description: string; content: string }) =>
      addSkill({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-skills"] });
      setSkillForm({ name: "", description: "", content: "" });
      setSkillModalOpen(false);
      toast.success("Skill added");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not add skill"),
  });

  const dropSkill = useMutation({
    mutationFn: (id: string) => removeSkill({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat-skills"] }),
    onError: (e: any) => toast.error(e?.message ?? "Could not delete skill"),
  });

  const allTools = useMemo<ChatTool[]>(
    () => [
      ...(customSkills.data ?? []).map((s) => ({
        id: `custom:${s.id}`,
        name: s.name,
        tagline: s.description || "Custom skill",
        system: s.content,
      })),
      ...tools,
    ],
    [tools, customSkills.data],
  );

  const activeModel = MODELS.find((m) => m.id === model)!;
  const filteredTools = useMemo(
    () =>
      allTools.filter((t) =>
        mentionQuery ? t.name.toLowerCase().includes(mentionQuery.toLowerCase()) : true,
      ),
    [allTools, mentionQuery],
  );

  const onSkillFile = async (file: File) => {
    const raw = await file.text();
    const parsed = parseSkillMd(raw, file.name.replace(/\.md$/i, ""));
    setSkillForm(parsed);
    setSkillModalOpen(true);
  };

  useEffect(() => {
    taRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const mut = useMutation({
    mutationFn: async (next: Msg[]) => {
      const toolContext = tool ? `${tool.name} — ${tool.tagline}\n${tool.system}` : undefined;
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
          <span className="text-sm font-medium text-foreground">Zentry Chat</span>
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

          <div className="ml-auto" />


          <div className="relative">

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
                  <div className="max-w-[85%] rounded-2xl border border-white/10 bg-white/[0.07] px-3.5 py-2 text-sm text-foreground whitespace-pre-wrap">
                    {m.content.split(/(@[\w][\w -]*)/g).map((part, j) =>
                      part.startsWith("@") ? (
                        <span
                          key={j}
                          className="rounded-md bg-primary/15 px-1 font-medium text-primary"
                        >
                          {part.trimEnd()}
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

          {mentionOpen && (
            <div className="absolute left-4 right-4 bottom-full mb-2 z-50 max-h-[min(50vh,22rem)] overflow-y-auto overscroll-contain rounded-2xl border border-primary/25 bg-[hsl(240_6%_9%/0.98)] backdrop-blur-xl p-1.5 shadow-2xl">
              {filteredTools.map((t) => (
                <div key={t.id} className="group flex items-center gap-1 rounded-xl hover:bg-primary/10">
                  <button
                    type="button"
                    onClick={() => pickTool(t)}
                    className="flex-1 min-w-0 text-left px-3 py-2"
                  >
                    <div className="text-sm text-primary truncate">@{t.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{t.tagline}</div>
                  </button>
                  {t.id.startsWith("custom:") && (
                    <button
                      type="button"
                      onClick={() => dropSkill.mutate(t.id.slice("custom:".length))}
                      aria-label={`Delete ${t.name}`}
                      className="h-7 w-7 mr-1 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {filteredTools.length === 0 && (
                <div className="px-3 py-2 text-[11px] text-muted-foreground">No matching skills.</div>
              )}
              {/* Kept at the bottom so it stays visible even when the list is long */}
              <div className="sticky bottom-0 flex items-center gap-1 px-1 pt-1.5 mt-1 border-t border-white/[0.07] bg-[hsl(240_6%_9%/0.98)]">
                <button
                  type="button"
                  onClick={() => setSkillModalOpen(true)}
                  className="liquid-btn h-8 flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 text-[11px] text-primary"
                >
                  <Plus className="h-3.5 w-3.5" /> Add skill
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="liquid-btn h-8 inline-flex items-center gap-1.5 rounded-xl px-3 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <Upload className="h-3.5 w-3.5" /> SKILL.md
                </button>
              </div>
            </div>
          )}


          <input
            ref={fileRef}
            type="file"
            accept=".md,text/markdown,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void onSkillFile(f);
            }}
          />

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

          {/* Connected YouTube channel — click to reference it in the message */}
          {channels.length > 0 && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={insertChannelMention}
                title={`Ask about ${channelLabel(activeChannel)}`}
                className="liquid-btn h-9 inline-flex max-w-[150px] items-center gap-1.5 rounded-xl px-2.5 text-xs text-foreground"
              >
                <Youtube className="h-3.5 w-3.5 text-red-500" />
                <span className="truncate">{channelLabel(activeChannel)}</span>
              </button>
              {channels.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setChannelMenuOpen((o) => !o)}
                    aria-label="Switch channel"
                    className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-primary text-[9px] font-semibold text-primary-foreground flex items-center justify-center"
                  >
                    {channels.length}
                  </button>
                  {channelMenuOpen && (
                    <div className="absolute left-0 bottom-full mb-2 z-50 w-[min(78vw,15rem)] max-h-56 overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[hsl(240_6%_9%/0.98)] backdrop-blur-xl p-1.5 shadow-2xl">
                      {channels.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setActiveChannelId(c.id);
                            setChannelMenuOpen(false);
                          }}
                          className={`w-full text-left rounded-xl px-2.5 py-2 transition-colors ${
                            c.id === activeChannel?.id ? "bg-white/[0.08]" : "hover:bg-white/[0.05]"
                          }`}
                        >
                          <div className="truncate text-[13px]">{channelLabel(c)}</div>
                          <div className="truncate text-[10px] text-muted-foreground">
                            {(c.meta as any)?.customUrl ?? c.handle ?? "YouTube"}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}


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

      {skillModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[hsl(240_6%_9%/0.97)] backdrop-blur-2xl p-5 shadow-2xl">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">Add a skill</h3>
              <button
                type="button"
                onClick={() => setSkillModalOpen(false)}
                aria-label="Close"
                className="ml-auto h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="liquid-btn mt-4 w-full h-10 inline-flex items-center justify-center gap-2 rounded-xl text-xs text-primary"
            >
              <Upload className="h-3.5 w-3.5" /> Import a SKILL.md file
            </button>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] text-muted-foreground">Name</label>
                <input
                  value={skillForm.name}
                  onChange={(e) => setSkillForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Retention Doctor"
                  className="mt-1 w-full h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">Description</label>
                <input
                  value={skillForm.description}
                  onChange={(e) => setSkillForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Diagnoses drop-off in short-form videos."
                  className="mt-1 w-full h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">Content (instructions)</label>
                <textarea
                  value={skillForm.content}
                  onChange={(e) => setSkillForm((f) => ({ ...f, content: e.target.value }))}
                  rows={6}
                  placeholder="You are… Always output…"
                  className="mt-1 w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={saveSkill.isPending || !skillForm.name.trim() || !skillForm.content.trim()}
              onClick={() =>
                saveSkill.mutate({
                  name: skillForm.name.trim(),
                  description: skillForm.description.trim(),
                  content: skillForm.content.trim(),
                })
              }
              className="liquid-btn liquid-btn--primary mt-4 w-full h-10 rounded-xl text-sm text-primary-foreground inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saveSkill.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save skill
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
