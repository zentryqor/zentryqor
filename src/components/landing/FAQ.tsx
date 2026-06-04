import { useState } from "react";
import { Plus } from "lucide-react";

const faqs = [
  { q: "What exactly is Zentry Qor?", a: "A premium operating system for creators — vault, AI tools, workspace, analytics, and community in one polished app." },
  { q: "What's included in the free tier?", a: "Limited daily downloads, watermarked previews, basic creator tools, and limited vault access. Enough to get a feel for the ecosystem." },
  { q: "Can I cancel anytime?", a: "Yes. Cancel in one click — you keep premium access until the end of your billing period." },
  { q: "Do you offer a student discount?", a: "Yes, verified students get 40% off. Email support after signup with your .edu address." },
  { q: "Is my data secure?", a: "Encryption in transit and at rest. We don't train models on your private content. Ever." },
  { q: "Do you support teams?", a: "Team workspaces are in private beta. Join the waitlist from your profile after signup." },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-28 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.2em] text-accent mb-3">FAQ</div>
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-gradient leading-[1.05]">
            Questions, answered.
          </h2>
        </div>

        <div className="space-y-2">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="glass rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between text-left px-5 py-4 hover:bg-elevated/40 transition-colors"
                >
                  <span className="text-[15px] font-medium tracking-tight">{f.q}</span>
                  <Plus className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`} />
                </button>
                <div
                  className={`grid transition-all duration-300 ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
