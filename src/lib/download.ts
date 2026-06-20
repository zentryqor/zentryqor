import { supabase } from "@/integrations/supabase/client";

export type DownloadLimitDetails = {
  downloadsUsed: number | null;
  downloadsRemaining: number | null;
  dailyLimit: number | null;
  resetAt: string | null;
  message?: string | null;
};

export class DownloadError extends Error {
  status: number;
  limitDetails?: DownloadLimitDetails;

  constructor(message: string, status: number, limitDetails?: DownloadLimitDetails) {
    super(message);
    this.status = status;
    this.limitDetails = limitDetails;
    this.name = "DownloadError";
  }
}

export async function downloadAsset(assetId: string, fallbackFilename: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new DownloadError("Please sign in again to download this asset.", 401);

  const res = await fetch(`/api/public/assets/download/${encodeURIComponent(assetId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const payload = await res.json().catch(() => ({}) as {
    url?: string;
    filename?: string;
    error?: string;
    downloadsUsed?: number | null;
    downloadsRemaining?: number | null;
    dailyLimit?: number | null;
    resetAt?: string | null;
  });

  if (!res.ok || !payload?.url) {
    throw new DownloadError(payload?.error || "Download failed", res.status, {
      downloadsUsed: payload.downloadsUsed ?? null,
      downloadsRemaining: payload.downloadsRemaining ?? null,
      dailyLimit: payload.dailyLimit ?? null,
      resetAt: payload.resetAt ?? null,
      message: payload.error ?? null,
    });
  }

  triggerAnchor(payload.url, payload.filename || fallbackFilename);
}

function triggerAnchor(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

