import { Reveal } from "./Cine";

const STEPS = [
  {
    n: "01",
    t: "Drop the raw clip",
    d: "Speech is transcribed to word-level timing with timestamps you can trust.",
  },
  {
    n: "02",
    t: "Direct it",
    d: "Cut on the timeline, pick a caption style, override a single word's font or colour.",
  },
  {
    n: "03",
    t: "Pull from the vault",
    d: "Overlays, LUTs and hooks are one click away — no tab switching, no re-licensing.",
  },
  {
    n: "04",
    t: "Export and post",
    d: "Burn to MP4 at your chosen resolution and bitrate, or hand off to After Effects and Premiere.",
  },
];

export function ScrollStory() {
  return (
    <section className="section-pad pt-0">
      <div className="shell grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <p className="eyebrow">Workflow</p>
            <h2 className="display-2 mt-4">Idea to upload in one sitting.</h2>
            <p className="body-cine mt-5 max-w-sm">
              The whole pipeline lives in one workspace, so nothing waits on an
              export you forgot to start.
            </p>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="border-t border-border">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.05}>
                <div className="group grid grid-cols-[auto_1fr] gap-6 border-b border-border py-8 md:py-10 transition-colors hover:bg-white/[0.02]">
                  <span className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground pt-1.5">
                    {s.n}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg md:text-xl font-semibold tracking-[-0.02em]">{s.t}</h3>
                    <p className="body-cine mt-2 max-w-lg">{s.d}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
