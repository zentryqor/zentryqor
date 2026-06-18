import { supabase } from "@/integrations/supabase/client";

export async function downloadAsset(assetId: string, fallbackFilename: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in again to download this asset.");

  const res = await fetch(`/api/public/assets/download/${encodeURIComponent(assetId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const payload = await res.json().catch(() => ({}) as { url?: string; filename?: string; error?: string });

  if (!res.ok || !payload?.url) {
    throw new Error(payload?.error || "Download failed");
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
