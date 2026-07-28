import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { RefreshCw, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/offline")({
  head: () => ({
    meta: [
      { title: "Offline — Zentry Qor" },
      { name: "description", content: "You're offline. Zentry Qor will reconnect automatically." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Offline — Zentry Qor" },
      { property: "og:description", content: "You're offline. Zentry Qor will reconnect automatically." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://zentryqor.lovable.app/offline" },
    ],
    links: [{ rel: "canonical", href: "https://zentryqor.lovable.app/offline" }],
  }),
  component: OfflinePage,
});

function OfflinePage() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => {
      setOnline(true);
      window.location.reload();
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 text-foreground">
      <motion.div
        initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm rounded-3xl border border-border/50 bg-elevated/40 p-8 text-center backdrop-blur-xl"
      >
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
          <WifiOff className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">You're offline</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {online
            ? "Reconnecting…"
            : "Pages you've already visited still work. We'll reload automatically the moment you're back online."}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Try again
        </button>
      </motion.div>
    </main>
  );
}
