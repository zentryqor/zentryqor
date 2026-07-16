import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { getAiCredits } from "@/lib/ai.functions";

/**
 * Compact pill showing the user's current AI credit balance.
 * Deduplicates with ProfileMenu / other consumers via the "ai-credits" key.
 */
export function CreditBadge({ className = "" }: { className?: string }) {
  const fetchCredits = useServerFn(getAiCredits);
  const { data: credits } = useQuery({
    queryKey: ["ai-credits"],
    queryFn: () => fetchCredits(),
    staleTime: 30_000,
  });

  const remaining = credits?.remaining ?? null;
  const limit = credits?.limit ?? null;
  const low = remaining !== null && limit !== null && remaining < limit * 0.15;

  return (
    <Link
      to="/billing"
      title={
        credits
          ? `${remaining} credits remaining today · ${limit}/day`
          : "AI credits"
      }
      className={`hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full border border-border/50 bg-elevated/40 hover:bg-elevated/70 transition text-xs font-medium ${className}`}
    >
      <Sparkles
        className={`h-3.5 w-3.5 ${low ? "text-destructive" : "text-primary"}`}
      />
      <span className="tabular-nums">
        {credits ? remaining : "—"}
        <span className="text-muted-foreground"> cr</span>
      </span>
    </Link>
  );
}
