import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, Gift, Users, Sparkles, CheckCircle2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { ProfileMenu } from "@/components/ProfileMenu";
import { getMyReferralInfo } from "@/lib/referrals.functions";

export const Route = createFileRoute("/_authenticated/refer")({
  head: () => ({
    meta: [
      { title: "Refer friends — Earn credits | Zentry Qor" },
      { name: "description", content: "Invite friends to Zentry Qor. Both of you get bonus AI credits when they make their first generation." },
    ],
  }),
  component: ReferPage,
});

function ReferPage() {
  const fetchInfo = useServerFn(getMyReferralInfo);
  const q = useQuery({ queryKey: ["referral-info"], queryFn: () => fetchInfo(), refetchInterval: 30000 });
  const info = q.data;
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = info?.code ? `${origin}/?ref=${info.code}` : "";

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <AnimatedOrbs />
      <AppHeader right={<ProfileMenu />} />

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-24">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl glass-strong flex items-center justify-center shrink-0">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Refer & earn</h1>
            <p className="text-muted-foreground mt-1 max-w-xl">
              Share your link. When a friend signs up and makes their first generation, you both get bonus AI credits.
            </p>
          </div>
        </div>

        <section className="glass-strong rounded-2xl p-6 mb-6">
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <RewardCard title="You get" amount={20} />
            <RewardCard title="Your friend gets" amount={10} />
            <RewardCard title="Per activated invite" amount={0} note="Credits never expire" />
          </div>

          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">Your invite link</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              readOnly
              value={link || "Loading…"}
              className="flex-1 rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-sm font-mono min-w-0"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(link);
                setCopied(true);
                toast.success("Link copied");
                setTimeout(() => setCopied(false), 2000);
              }}
              disabled={!link}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-black px-4 py-2.5 text-sm font-medium hover:bg-white/90 disabled:opacity-50"
            >
              <Copy className="w-4 h-4" /> {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          {info?.code && (
            <p className="text-xs text-muted-foreground mt-3">
              Or share your code: <span className="font-mono text-foreground">{info.code}</span>
            </p>
          )}
        </section>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard icon={<Users className="w-4 h-4" />} label="Invites" value={info?.totalInvites ?? 0} />
          <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label="Activated" value={info?.activated ?? 0} />
          <StatCard icon={<Sparkles className="w-4 h-4" />} label="Credits earned" value={info?.creditsEarned ?? 0} />
          <StatCard icon={<Gift className="w-4 h-4" />} label="Bonus balance" value={info?.bonusCredits ?? 0} />
        </div>

        <section className="glass-strong rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h2 className="font-medium">Recent invites</h2>
          </div>
          {!info?.recent?.length ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No invites yet. Share your link to start earning credits.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground bg-white/[0.02]">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Invited</th>
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  <th className="text-right px-4 py-2.5 font-medium">Credits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {info.recent.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {r.awarded_at ? (
                        <span className="text-emerald-300 text-xs">Activated</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Pending first generation</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {r.credits_referrer ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}

function RewardCard({ title, amount, note }: { title: string; amount: number; note?: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{title}</div>
      {amount > 0 ? (
        <div className="mt-1 text-2xl font-semibold">+{amount} <span className="text-sm font-normal text-muted-foreground">credits</span></div>
      ) : (
        <div className="mt-1 text-sm text-foreground/80">{note}</div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="glass-strong rounded-2xl p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">{icon}{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value.toLocaleString()}</div>
    </div>
  );
}
