import { supabase } from "@/integrations/supabase/client";

export class DownloadError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
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

  const payload = await res.json().catch(() => ({}) as { url?: string; filename?: string; error?: string });

  if (!res.ok || !payload?.url) {
    throw new DownloadError(payload?.error || "Download failed", res.status);
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

