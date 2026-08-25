import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./Cine";
import shotVault from "@/assets/cine-1.jpg";
import shotTimeline from "@/assets/cine-5.jpg";
import shotSmoke from "@/assets/cine-3.jpg";

type Block = {
  eyebrow: string;
  title: string;
  copy: string;
  bullets: string[];
  href: string;
  image: string;
  alt: string;
  w: number;
  h: number;
  flip?: boolean;
  ratio: string;
};

const BLOCKS: Block[] = [
  {
    eyebrow: "Caption engine",
    title: "Captions that look art-directed, not auto-generated.",
    copy:
      "Upload a clip, get word-level timing, then edit on a real timeline — cut, zoom, snap to frame, restyle any single word.",
    bullets: ["20+ caption styles", "Per-word font & colour", "Export MP4, .aep, .prproj"],
    href: "/studio",
    image: shotTimeline,
    alt: "Editing timeline glowing in a dark room",
    w: 1600,
    h: 900,
    ratio: "aspect-[16/10]",
  },
  {
    eyebrow: "Asset vault",
    title: "A curated vault, not a stock dump.",
    copy:
      "Overlays, LUTs, transitions, hook libraries and templates — organised like a repository, downloadable as one zip.",
    bullets: ["Multi-select bulk download", "Repo-style file browser", "New drops weekly"],
    href: "/templates",
    image: shotVault,
    alt: "Cinema lens on black background",
    w: 1024,
    h: 1280,
    flip: true,
    ratio: "aspect-[4/5]",
  },
  {
    eyebrow: "AI studio",
    title: "A creative desk that answers in your voice.",
    copy:
      "Chat with your own skills, mention any tool with @, pull your connected channel's data in for context-aware ideas.",
    bullets: ["Custom SKILL.md skills", "@tool mentions", "Channel-aware answers"],
    href: "/studio",
    image: shotSmoke,
    alt: "Green light streaks through dark smoke",
    w: 1600,
    h: 900,
    ratio: "aspect-[16/10]",
  },
];

export function Features() {
  return (
    <section id="features" className="section-pad pt-0">
      <div className="shell space-y-24 md:space-y-40">
        {BLOCKS.map((b) => (
          <div
            key={b.title}
            className="grid items-center gap-10 md:gap-16 lg:grid-cols-12"
          >
            <Reveal
              className={`lg:col-span-5 ${b.flip ? "lg:order-2" : ""}`}
            >
              <p className="eyebrow">{b.eyebrow}</p>
              <h3 className="display-3 mt-4">{b.title}</h3>
              <p className="body-cine mt-5">{b.copy}</p>
              <ul className="mt-7 space-y-2.5">
                {b.bullets.map((li) => (
                  <li key={li} className="flex items-center gap-3 text-[13px] text-foreground/80">
                    <span className="h-1 w-1 rounded-full bg-primary" />
                    {li}
                  </li>
                ))}
              </ul>
              <Link
                to={b.href}
                search={b.href === "/studio" ? ({ screen: "dashboard" } as never) : undefined}
                className="btn-cine-ghost mt-9 group"
              >
                Explore
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Reveal>

            <Reveal
              delay={0.08}
              className={`lg:col-span-7 ${b.flip ? "lg:order-1" : ""}`}
            >
              <div className={`media-frame ${b.ratio}`}>
                <img src={b.image} alt={b.alt} width={b.w} height={b.h} loading="lazy" />
              </div>
            </Reveal>
          </div>
        ))}
      </div>
    </section>
  );
}
