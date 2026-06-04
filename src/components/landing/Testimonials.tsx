const testimonials = [
  {
    q: "Zentry Qor replaced 6 tools. My output doubled in a month.",
    a: "Maya R.", r: "Reels creator · 480K",
  },
  {
    q: "The vault alone is worth it. The AI tools are the cherry on top.",
    a: "Daniel K.", r: "Video editor",
  },
  {
    q: "Finally a creator app that doesn't feel like a template.",
    a: "Sora T.", r: "Designer · founder",
  },
  {
    q: "I plan, edit, and ship without leaving the app.",
    a: "Liam P.", r: "YouTuber · 1.2M",
  },
];

export function Testimonials() {
  return (
    <section className="py-28 px-4 border-y border-border">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mb-12">
          <div className="text-xs uppercase tracking-[0.2em] text-accent mb-3">Loved by creators</div>
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-gradient leading-[1.05]">
            Built with feedback from real operators.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          {testimonials.map((t) => (
            <figure key={t.a} className="glass rounded-2xl p-6 magnetic">
              <blockquote className="text-[15px] leading-relaxed tracking-tight">"{t.q}"</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent" />
                <div>
                  <div className="text-sm font-medium">{t.a}</div>
                  <div className="text-xs text-muted-foreground">{t.r}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
