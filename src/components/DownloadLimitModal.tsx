import { Link } from "@tanstack/react-router";
import { Clock, Download, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DownloadLimitDetails } from "@/lib/download";

type DownloadLimitModalProps = {
  details: DownloadLimitDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DownloadLimitModal({ details, open, onOpenChange }: DownloadLimitModalProps) {
  const dailyLimit = details?.dailyLimit ?? 3;
  const downloadsUsed = details?.downloadsUsed ?? dailyLimit;
  const downloadsRemaining = details?.downloadsRemaining ?? Math.max(dailyLimit - downloadsUsed, 0);
  const resetText = formatResetTime(details?.resetAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-border bg-background p-0 overflow-hidden">
        <div className="p-6">
          <DialogHeader>
            <div className="mx-auto sm:mx-0 mb-4 h-12 w-12 rounded-full bg-elevated flex items-center justify-center text-accent">
              <Download className="h-5 w-5" />
            </div>
            <DialogTitle className="text-2xl tracking-tight">Download limit exceeded</DialogTitle>
            <DialogDescription>
              Free accounts can download {dailyLimit} assets per day. Upgrade for unlimited downloads.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-elevated/70 p-4 ring-1 ring-border">
              <div className="text-3xl font-semibold tabular-nums">{downloadsRemaining}</div>
              <div className="mt-1 text-xs text-muted-foreground uppercase tracking-wider">Left today</div>
            </div>
            <div className="rounded-xl bg-elevated/70 p-4 ring-1 ring-border">
              <div className="text-3xl font-semibold tabular-nums">{downloadsUsed}/{dailyLimit}</div>
              <div className="mt-1 text-xs text-muted-foreground uppercase tracking-wider">Used today</div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-elevated/40 px-4 py-3 text-sm text-muted-foreground ring-1 ring-border">
            <Clock className="h-4 w-4 text-accent" />
            Limit resets {resetText}.
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border bg-elevated/30 p-4 sm:space-x-0">
          <DialogClose className="h-10 px-4 rounded-xl glass-strong text-sm font-medium">
            Not now
          </DialogClose>
          <Link
            to="/billing"
            className="h-10 px-4 rounded-xl bg-foreground text-background text-sm font-medium flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" /> Upgrade now
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatResetTime(resetAt: string | null | undefined) {
  if (!resetAt) return "tomorrow";
  const date = new Date(resetAt);
  if (Number.isNaN(date.getTime())) return "tomorrow";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}