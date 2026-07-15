import { useEffect, useState } from "react";
import { X, ChevronRight, Sparkles } from "lucide-react";

export type TutorialStep = {
  title: string;
  body: string;
};

type Props = {
  storageKey: string; // unique per page, e.g. "tutorial:dashboard:v1"
  title: string;
  steps: TutorialStep[];
};

/**
 * Full-screen (modal) first-visit tutorial. Renders only if the user has
 * never dismissed it. Stored per key in localStorage so each dashboard
 * page shows its own walkthrough once.
 */
export function FirstVisitTutorial({ storageKey, title, steps }: Props) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = window.localStorage.getItem(storageKey);
      if (!seen) {
        // small delay so the page paints first
        const t = setTimeout(() => setOpen(true), 350);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [storageKey]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {}
    setOpen(false);
  };

  if (!open || steps.length === 0) return null;
  const step = steps[i];
  const isLast = i === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-elevated/95 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-accent">
            <Sparkles className="w-3.5 h-3.5" />
            Quick tour · {i + 1} / {steps.length}
          </div>
          <button
            onClick={dismiss}
            aria-label="Skip tutorial"
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-elevated transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 pt-3 pb-2">
          <div className="text-xs text-muted-foreground mb-1">{title}</div>
          <h3 className="text-xl font-semibold tracking-tight mb-2">{step.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border/40">
          <button
            onClick={dismiss}
            className="text-xs text-muted-foreground hover:text-foreground transition"
          >
            Skip
          </button>
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? "w-6 bg-accent" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => (isLast ? dismiss() : setI(i + 1))}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 transition"
          >
            {isLast ? "Got it" : "Next"}
            {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
