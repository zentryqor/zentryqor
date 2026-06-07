import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { Mail, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Zentry Qor" },
      { name: "description", content: "Get in touch with the Zentry Qor team." },
      { property: "og:title", content: "Contact — Zentry Qor" },
      { property: "og:description", content: "Get in touch with the Zentry Qor team." },
    ],
  }),
  component: ContactPage,
});

const channels = [
  { icon: MessageCircle, title: "Support", body: "Account, billing, or product questions.", value: "zentriqor@gmail.com" },
];

function ContactPage() {
  const [sending, setSending] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "");
    const email = String(data.get("email") ?? "");
    const subject = String(data.get("subject") ?? "");
    const message = String(data.get("message") ?? "");

    const mailto = `mailto:zentriqor@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`
    )}`;

    setSending(true);
    window.location.href = mailto;
    setTimeout(() => {
      setSending(false);
      form.reset();
      toast.success("Message sent — we'll reply within one business day.");
    }, 700);
  };

  return (
    <PageShell
      eyebrow="Contact"
      title={<>Let's <span className="text-aurora italic font-medium">talk.</span></>}
      description="Send us a note directly — we read every message."
    >
      <div className="grid sm:grid-cols-1 gap-3 mb-10 max-w-sm">
        {channels.map((c) => (
          <a key={c.title} href={`mailto:${c.value}`} className="glass rounded-2xl p-5 hover:bg-elevated/40 transition-colors block">
            <c.icon className="h-5 w-5 text-accent icon-fx mb-3" />
            <h3 className="text-sm font-semibold tracking-tight mb-1">{c.title}</h3>
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{c.body}</p>
            <p className="text-xs text-accent truncate">{c.value}</p>
          </a>
        ))}
      </div>

      <form onSubmit={onSubmit} className="glass-strong rounded-2xl p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Send a message</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Name</label>
            <input required name="name" className="w-full h-11 px-4 rounded-xl bg-elevated/60 border border-border focus:border-accent outline-none text-sm transition-colors" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
            <input required type="email" name="email" className="w-full h-11 px-4 rounded-xl bg-elevated/60 border border-border focus:border-accent outline-none text-sm transition-colors" />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Subject</label>
          <input required name="subject" className="w-full h-11 px-4 rounded-xl bg-elevated/60 border border-border focus:border-accent outline-none text-sm transition-colors" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Message</label>
          <textarea required name="message" rows={5} className="w-full px-4 py-3 rounded-xl bg-elevated/60 border border-border focus:border-accent outline-none text-sm resize-none transition-colors" />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="h-11 px-5 rounded-xl bg-foreground text-background text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send message"}
          <Send className="h-4 w-4 icon-fx" />
        </button>
      </form>
    </PageShell>
  );
}
