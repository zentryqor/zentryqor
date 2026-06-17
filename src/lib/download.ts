import { supabase } from "@/integrations/supabase/client";

export async function downloadAsset(assetId: string, fallbackFilename: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in again to download this asset.");

  const res = await fetch(`/api/public/assets/download/${encodeURIComponent(assetId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "Download failed");
  }

  const blob = await res.blob();
  const filename = getFilename(res.headers.get("content-disposition")) || fallbackFilename;
  const blobUrl = URL.createObjectURL(blob);
  triggerAnchor(blobUrl, filename);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
}

function getFilename(contentDisposition: string | null) {
  if (!contentDisposition) return null;
  const encoded = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) return decodeURIComponent(encoded);
  const plain = contentDisposition.match(/filename="?([^";]+)"?/i)?.[1];
  return plain ? plain.trim() : null;
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
