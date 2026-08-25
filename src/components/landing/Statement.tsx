import { Reveal } from "./Cine";

export function Statement() {
  return (
    <section className="section-pad">
      <div className="shell">
        <Reveal>
          <p className="display-2 max-w-4xl">
            Nine tools, one tab.{" "}
            <span className="text-muted-foreground">
              Everything a short-form studio needs to write, design, caption and
              ship — without paying for five subscriptions.
            </span>
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-6">
          {[
            { k: "1,200+", v: "Premium assets" },
            { k: "9", v: "AI tools" },
            { k: "30/60", v: "FPS caption export" },
            { k: "<2 min", v: "Idea to post" },
          ].map((s, i) => (
            <Reveal key={s.v} delay={i * 0.06}>
              <div className="border-t border-border pt-5">
                <div className="text-2xl md:text-3xl font-semibold tracking-[-0.03em]">{s.k}</div>
                <div className="mt-1 text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
                  {s.v}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
