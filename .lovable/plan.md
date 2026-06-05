
# Site-Wide Signature Redesign

A coordinated pass across every page to add heavy motion, asymmetry, a wow interaction, and sharper copy — without changing functionality.

## 1. Global motion primitives (build once, reuse everywhere)

New files under `src/components/motion/`:
- `MagneticButton.tsx` — wraps any element, tracks mouse and pulls the element ~8–14px toward cursor with spring physics. Used on every primary CTA.
- `TiltCard.tsx` — perspective-1000 wrapper, reads mouse position, applies `rotateX/rotateY` (max ~10°) + a moving specular highlight overlay. Used on hero preview, pricing card, vault tiles, dashboard stat cards.
- `ParallaxLayer.tsx` — `useScroll` + `useTransform` from framer-motion. Three speeds (slow/med/fast) for backgrounds and decorative orbs.
- `Reveal.tsx` — IntersectionObserver-based "blur-to-focus" + slide reveal. Replaces ad-hoc `whileInView` blocks for consistent timing.
- `GlassMorph.tsx` — animated backdrop-blur transition (blur 0px → 24px) for modal/drawer open and section dividers.
- `ScrollProgressRail.tsx` — sticky thin gradient bar on the right edge of long pages.

## 2. Hero — make it signature

Goal: stop feeling like a SaaS template.

- Replace centered hero with an **asymmetric split**: oversized left-aligned wordmark headline, smaller right-column "manifesto" paragraph + dual CTAs.
- **Marquee strip** of creator handles/categories drifting horizontally beneath the headline (low-opacity, parallax-counter-scroll).
- **Floating glass orbs** with parallax (3 layers, different speeds, mouse-parallax on hover of hero area).
- **Live mock dashboard preview** becomes a `TiltCard` with:
  - Animated counter that increments on view (Downloads 1,284 → counts up)
  - A faux "AI run" line that types itself character-by-character every 6s
  - A small animated sparkline in one stat card
  - Subtle floating "pack thumbnail" cards that drift on a slow loop
- **Aurora gradient text** (MagicUI-style) on the brand line — animated hue shift, not static gradient.
- Copy rewrite: replace "Your ultimate creator operating system" with a sharper, opinionated line (3 options — picks one with most punch, e.g. *"Stop juggling 9 tools. Ship like a studio."*).

## 3. Asymmetry across grids

- **Features (Bento)**: rebuild as a true bento grid — 5 cards of 3 different sizes (large hero card spans 2×2, two wide cards span 2×1, two compact 1×1). One card features a live mini-preview (e.g. a tiny animated chart for Analytics; a typed-out caption for AI tools). Each card uses `TiltCard` + glass hover sheen.
- **VaultPreview**: break the uniform 3-col grid — first card spans 2 cols and is taller, badges animate in with stagger, hover reveals a "Preview" overlay with `GlassMorph` blur-in.
- **Testimonials**: alternating column heights (1st & 3rd taller, 2nd & 4th shorter with offset translateY), each with a magnetic hover and a quote-mark watermark that parallaxes inside the card.
- **Pricing**: featured plan card scales 1.05× and floats; competitor columns slightly recede. Add a subtle border-beam to the recommended plan.

## 4. Wow interaction — Scroll Storytelling

A new `<ScrollStory />` section between Features and VaultPreview:
- Pinned 100vh canvas with a stylized creator workflow diorama
- As the user scrolls, 4 stages transition: *Idea → Asset → Edit → Ship*
- Each stage animates: icons morph, lines connect via `AnimatedBeam`-style SVG paths, the previous stage blurs and recedes
- Implemented with `useScroll({ offset: ['start start', 'end start'] })` and `useTransform` to drive opacity/translateY of each stage panel
- Mobile fallback: simplified vertical stepper with staggered reveals (no pinning)

## 5. Glass-morph section transitions

Between every major landing section: a thin animated divider that uses `backdrop-blur` + a moving gradient highlight that sweeps left→right when the section enters view. Replaces flat `border-y` lines.

## 6. Other pages — same motion language

- **Auth (`/auth`)**: split layout, left side animated gradient orbs + rotating creator quotes, right side glass card form with magnetic submit button.
- **Dashboard (`/dashboard`)**: stat cards become `TiltCard`s with count-up numbers; greeting line types in; sidebar items get a magnetic hover.
- **Billing (`/billing`)**: pricing card gets border-beam, plan-feature list reveals row-by-row with stagger, the existing toggle keeps its sliding pill (already done) plus a subtle scale pulse on switch.
- **AI Studio (`/ai`)**: tool tiles become a bento (3 sizes), the modal opens with a `GlassMorph` blur-in instead of a hard fade, generate button is magnetic, output reveals with the typewriter effect.
- **Assets (`/assets`)**: vault grid mirrors landing VaultPreview asymmetry; hover-tilt on cards.
- **Onboarding**: each step transitions via glass-morph blur, progress dots animate fill.

## 7. Copywriting pass

Rewrite generic AI-sounding copy across:
- Hero headline + sub + CTAs
- Section eyebrows ("The system" → something with edge)
- Feature card titles + descriptions (cut hedging words, add specifics)
- Pricing plan descriptions
- Testimonials (keep voice, tighten)
- FAQ answers (cut filler, lead with the answer)
- CTA footer line

Voice target: confident, direct, slightly opinionated — like Linear or Vercel marketing. Short sentences. Concrete nouns. Numbers where possible.

## 8. Performance guardrails

- Respect `prefers-reduced-motion`: every motion primitive checks the media query and degrades to static fade-in.
- All tilt/parallax handlers throttled with `requestAnimationFrame`.
- Heavy effects (scroll story canvas) lazy-mount via IntersectionObserver — don't render until ~200px before viewport.
- Marquee uses CSS `@keyframes` (GPU-cheap), not JS.

## 9. Dependencies

Already installed: `framer-motion`, `lucide-react`. No new packages required (MagicUI components ported inline where used, no npm install).

## Out of scope

- No backend, schema, auth, or business-logic changes.
- No new routes, no removed pages.
- No design-system token changes beyond adding 1–2 motion-related CSS variables (e.g. `--ease-magnetic`).

## Effort

Roughly 12–16 file edits + 6 new motion primitive files. Largest churn is on landing components; other pages get lighter polish using the same primitives. I'll work in this order: motion primitives → hero → bento features → scroll story → vault/testimonials/pricing → other pages → copywriting sweep.

Tell me to proceed and I'll start.
