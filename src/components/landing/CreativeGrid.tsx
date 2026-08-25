import { Link } from "@tanstack/react-router";
import { Reveal, SectionHead } from "./Cine";
import a from "@/assets/cine-2.jpg";
import b from "@/assets/cine-4.jpg";
import c from "@/assets/cine-3.jpg";
import d from "@/assets/cine-1.jpg";
import e from "@/assets/cine-5.jpg";

const ITEMS = [
  { img: c, label: "Atmosphere pack", meta: "16:9 · 24 clips", span: "md:col-span-7", ratio: "aspect-[16/9]" },
  { img: a, label: "Vertical hooks", meta: "9:16 · 40 templates", span: "md:col-span-5", ratio: "aspect-[9/16] md:aspect-[3/4]" },
  { img: d, label: "Lens flares", meta: "4:5 · 18 overlays", span: "md:col-span-4", ratio: "aspect-[4/5]" },
  { img: b, label: "Colour LUTs", meta: "1:1 · 36 looks", span: "md:col-span-4", ratio: "aspect-square" },
  { img: e, label: "Caption presets", meta: "16:9 · 20 styles", span: "md:col-span-4", ratio: "aspect-[4/5] md:aspect-square" },
];

export function CreativeGrid() {
  return (
    <section id="work" className="section-pad">
      <div className="shell">
        <SectionHead
          eyebrow="Selected work"
          title="Made with the vault."
          copy="A slice of what creators pull, restyle and ship every week."
        />

        <div className="mt-14 grid gap-4 md:grid-cols-12 md:gap-5">
          {ITEMS.map((it, i) => (
            <Reveal key={it.label} delay={i * 0.05} className={it.span}>
              <Link to="/templates" className="group block">
                <div className={`media-frame ${it.ratio}`}>
                  <img src={it.img} alt={it.label} loading="lazy" />
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-4">
                  <span className="text-[13px] font-medium">{it.label}</span>
                  <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    {it.meta}
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
