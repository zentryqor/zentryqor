import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getMyContext, saveOnboarding } from "@/lib/preferences.functions";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — Zentry Qor" }] }),
  component: Onboarding,
});

const CREATOR_TYPES = [
  { v: "video_editor", l: "Video Editor", e: "🎬" },
  { v: "content_creator", l: "Content Creator", e: "🎙️" },
  { v: "designer", l: "Designer", e: "🎨" },
  { v: "photographer", l: "Photographer", e: "📸" },
  { v: "freelancer", l: "Freelancer", e: "💼" },
  { v: "entrepreneur", l: "Entrepreneur", e: "🚀" },
  { v: "developer", l: "Developer", e: "⚡" },
  { v: "other", l: "Something else", e: "✨" },
] as const;

const INTERESTS = [
  "Editing", "Motion", "Color grading", "Sound design",
  "Branding", "UI/UX", "Typography", "Illustration",
  "Photography", "Lightroom", "AI tools", "Hooks & captions",
  "Thumbnails", "Storytelling", "Monetization", "Growth",
];

const PLATFORMS = [
  "YouTube", "TikTok", "Instagram", "X / Twitter",
  "LinkedIn", "Twitch", "Pinterest", "Behance",
];

const SKILLS = [
  { v: "beginner", l: "Beginner", d: "Just getting started" },
  { v: "intermediate", l: "Intermediate", d: "Comfortable with the basics" },
  { v: "advanced", l: "Advanced", d: "Years of experience" },
  { v: "pro", l: "Pro", d: "This is my career" },
] as const;

function Onboarding() {
  const navigate = useNavigate();
  const save = useServerFn(saveOnboarding);
  const fetchCtx = useServerFn(getMyContext);
  const { data: ctx } = useQuery({ queryKey: ["me"], queryFn: () => fetchCtx() });

  const [step, setStep] = useState(0);
  const [creatorType, setCreatorType] = useState<string>("");
  const [niche, setNiche] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [skill, setSkill] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ctx?.profile?.onboarding_completed) navigate({ to: "/dashboard" });
  }, [ctx, navigate]);

  const steps = ["Type", "Niche", "Interests", "Platforms", "Skill"];
  const canNext = [
    creatorType !== "",
    niche.trim().length > 0,
    interests.length > 0,
    platforms.length > 0,
    skill !== "",
  ][step];

  function toggle(arr: string[], setArr: (v: string[]) => void, value: string, max = 12) {
    if (arr.includes(value)) setArr(arr.filter((v) => v !== value));
    else if (arr.length < max) setArr([...arr, value]);
  }

  async function finish() {
    setSaving(true);
    try {
      await save({
        data: {
          creator_type: creatorType as never,
          niche: niche.trim(),
          interests,
          platforms,
          skill_level: skill as never,
          goals: [],
        },
      });
      toast.success("You're all set ✨");
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="relative max-w-2xl mx-auto px-6 pt-14 pb-24">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-[0.3em] text-accent mb-3 flex items-center justify-center gap-2">
            <Sparkles className="h-3 w-3" /> Step {step + 1} of {steps.length}
          </div>
          <div className="flex items-center justify-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === step ? "w-10 bg-foreground" : i < step ? "w-6 bg-foreground/60" : "w-6 bg-border"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="glass-strong rounded-3xl p-8 sm:p-10">
          {step === 0 && (
            <Step title="What kind of creator are you?" subtitle="We'll tailor your vault and tools.">
              <div className="grid grid-cols-2 gap-2.5">
                {CREATOR_TYPES.map((t) => (
                  <button
                    key={t.v}
                    onClick={() => setCreatorType(t.v)}
                    className={`text-left p-4 rounded-2xl border transition-all ${
                      creatorType === t.v
                        ? "border-foreground bg-elevated"
                        : "border-border glass hover:border-foreground/30"
                    }`}
                  >
                    <div className="text-2xl">{t.e}</div>
                    <div className="text-sm font-medium mt-2">{t.l}</div>
                  </button>
                ))}
              </div>
            </Step>
          )}

          {step === 1 && (
            <Step title="What's your niche?" subtitle="e.g. fitness, tech reviews, indie SaaS, weddings…">
              <input
                autoFocus
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                maxLength={80}
                placeholder="Type your niche"
                className="w-full h-14 px-5 rounded-2xl glass border border-border focus:border-foreground/40 focus:outline-none text-lg"
              />
            </Step>
          )}

          {step === 2 && (
            <Step title="What are you into?" subtitle={`Pick up to 12 — ${interests.length} selected`}>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((i) => {
                  const active = interests.includes(i);
                  return (
                    <button
                      key={i}
                      onClick={() => toggle(interests, setInterests, i, 12)}
                      className={`px-4 h-10 rounded-full text-sm border transition-all flex items-center gap-1.5 ${
                        active
                          ? "bg-foreground text-background border-foreground"
                          : "glass border-border hover:border-foreground/30"
                      }`}
                    >
                      {active && <Check className="h-3 w-3" />} {i}
                    </button>
                  );
                })}
              </div>
            </Step>
          )}

          {step === 3 && (
            <Step title="Where do you publish?" subtitle="Select all that apply.">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PLATFORMS.map((p) => {
                  const active = platforms.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => toggle(platforms, setPlatforms, p, 10)}
                      className={`h-12 rounded-xl text-sm border transition-all ${
                        active
                          ? "bg-foreground text-background border-foreground"
                          : "glass border-border hover:border-foreground/30"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </Step>
          )}

          {step === 4 && (
            <Step title="How would you rate your skill?" subtitle="We'll calibrate recommendations.">
              <div className="space-y-2">
                {SKILLS.map((s) => (
                  <button
                    key={s.v}
                    onClick={() => setSkill(s.v)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
                      skill === s.v
                        ? "border-foreground bg-elevated"
                        : "border-border glass hover:border-foreground/30"
                    }`}
                  >
                    <div>
                      <div className="font-medium">{s.l}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{s.d}</div>
                    </div>
                    {skill === s.v && <Check className="h-4 w-4 text-accent" />}
                  </button>
                ))}
              </div>
            </Step>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="h-10 px-4 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 disabled:opacity-30"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canNext}
                className="h-10 px-5 rounded-xl bg-foreground text-background text-sm font-medium magnetic disabled:opacity-30 flex items-center gap-1.5"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={finish}
                disabled={!canNext || saving}
                className="h-10 px-5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-medium magnetic glow-primary disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Enter Zentry Qor
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em]">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1.5 mb-6">{subtitle}</p>
      {children}
    </div>
  );
}
