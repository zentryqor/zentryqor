const logos = [
  "Framer", "Notion", "Linear", "Stripe", "Arc", "Vercel", "Figma", "Loom", "Superhuman", "Raycast",
];

export function SocialProof() {
  return (
    <section className="py-16 px-4 border-y border-border bg-surface/40">
      <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground mb-8">
        Trusted by creators from
      </p>
      <div className="relative max-w-6xl mx-auto overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
        <div className="flex gap-14 animate-marquee whitespace-nowrap">
          {[...logos, ...logos].map((l, i) => (
            <span key={i} className="text-2xl font-semibold tracking-tight text-muted-foreground/70 hover:text-foreground transition-colors">
              {l}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
