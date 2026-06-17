// Trigger a direct file download from a URL without navigating or opening
// a new tab. Tries blob download first (best UX, works across browsers when
// CORS allows); falls back to a same-tab anchor click which still triggers
// a download because the signed URL carries Content-Disposition: attachment.
export async function downloadFromUrl(url: string, filename: string) {
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    triggerAnchor(blobUrl, filename, false);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    return;
  } catch {
    // Fall back to direct anchor — Supabase signed URLs created with
    // { download: filename } set Content-Disposition: attachment, so the
    // browser will save the file instead of navigating to it.
    triggerAnchor(url, filename, false);
  }
}

function triggerAnchor(href: string, filename: string, newTab: boolean) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  if (newTab) a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
