import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { PwaProvider } from "@/components/pwa/PwaProvider";
import { iosSplashLinks } from "@/lib/ios-splash";



function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
      },
      { title: "Zentry Qor — Ship like a studio." },
      { name: "description", content: "A premium asset vault and nine AI tools for short-form creators — captions, hooks, scripts, thumbnails, and more. One subscription. One tab." },
      { name: "author", content: "Zentry Qor" },
      { name: "theme-color", content: "#0F0F0F" },
      { name: "color-scheme", content: "dark" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Zentry Qor" },
      { name: "application-name", content: "Zentry Qor" },
      { name: "google-site-verification", content: "vOuTxkxNavC3Xbw52B2bKlrbLYPcXgdt_sOCDk7v72A" },

      { property: "og:title", content: "Zentry Qor — Ship like a studio." },
      { property: "og:description", content: "A premium asset vault and nine AI tools for short-form creators — captions, hooks, scripts, thumbnails, and more. One subscription. One tab." },
      { property: "og:site_name", content: "Zentry Qor" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Zentry Qor — Ship like a studio." },
      { name: "twitter:description", content: "A premium asset vault and nine AI tools for short-form creators — captions, hooks, scripts, thumbnails, and more. One subscription. One tab." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/0df16769-4d54-41b0-8c95-6a35da2a69e4" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/0df16769-4d54-41b0-8c95-6a35da2a69e4" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Zentry Qor",
          url: "https://zentryqor.lovable.app",
          logo: "https://zentryqor.lovable.app/favicon.ico",
          description:
            "Zentry Qor is a premium creator productivity vault — assets, AI tools, and a workspace for digital creators.",
          sameAs: [],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Zentry Qor",
          url: "https://zentryqor.lovable.app",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://zentryqor.lovable.app/?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", href: "/favicon.png", sizes: "any" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "mask-icon", href: "/icons/icon-512.png", color: "#0F0F0F" },
      ...iosSplashLinks,
    ],


  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Verify the Appwrite backend connection on app start.
    import("@/lib/appwrite").then(({ appwritePing }) => void appwritePing());
    let mounted = true;


    // Capture ?ref=CODE from URL and stash for post-signup processing
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref && /^[A-Za-z0-9]{4,32}$/.test(ref)) {
        window.localStorage.setItem("zq_ref_code", ref.toUpperCase());
      }
    } catch {}

    import("@/integrations/supabase/client").then(({ supabase }) => {
      if (!mounted) return;
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;

        // On sign-in, if we have a stashed referral code, apply it (best-effort)
        if (event === "SIGNED_IN") {
          try {
            const ref = window.localStorage.getItem("zq_ref_code");
            if (ref) {
              import("@/lib/referrals.functions").then(({ recordReferralFromCode }) => {
                recordReferralFromCode({ data: { code: ref } })
                  .then(() => window.localStorage.removeItem("zq_ref_code"))
                  .catch(() => {});
              });
            }
          } catch {}
        }

        router.invalidate();
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      });
      // cleanup
      (window as unknown as { __zqAuthSub?: { unsubscribe: () => void } }).__zqAuthSub?.unsubscribe();
      (window as unknown as { __zqAuthSub?: { unsubscribe: () => void } }).__zqAuthSub = data.subscription;
    });
    return () => { mounted = false; };
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <PwaProvider />
    </QueryClientProvider>
  );

}
