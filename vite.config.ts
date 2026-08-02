// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      mcpPlugin(),
      VitePWA({
        strategies: "generateSW",
        registerType: "prompt",
        // The guarded wrapper in src/lib/pwa/register-sw.ts is the ONLY registrar.
        injectRegister: null,
        // Never emit or serve a service worker in dev / Lovable preview.
        devOptions: { enabled: false },
        // Manifest is a static file in public/ so it stays stable across builds.
        manifest: false,
        filename: "sw.js",
        // TanStack Start emits browser assets to dist/client; keep the SW beside them.
        outDir: "dist/client",
        workbox: {
          globDirectory: "dist/client",
          globPatterns: ["**/*.{js,css,woff,woff2,svg,png,ico}"],
          globIgnores: [
            "**/node_modules/**",
            "**/sw.js",
            "**/workbox-*.js",
            // FCM messaging worker: separate worker/scope, never precached.
            "**/firebase-messaging-sw.js",
          ],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: false,
          // Precache the offline shell + key public pages at install time so they
          // are available instantly, even on a first offline launch.
          additionalManifestEntries: [
            "/offline",
            "/",
            "/gallery",
            "/templates",
            "/docs",
            "/help",
            "/about",
            "/manifest.webmanifest",
          ].map((url) => ({ url, revision: `${Date.now()}` })),
          navigateFallback: "/offline",
          navigateFallbackDenylist: [
            /^\/api\//,
            /^\/~oauth/,
            /^\/\.mcp/,
            /^\/\.well-known/,
            /^\/mcp/,
            /^\/sitemap\.xml$/,
          ],
          runtimeCaching: [
            {
              // HTML navigations: try the network briefly, then fall back to the
              // cached page so previously visited routes open instantly offline.
              urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "zq-pages",
                networkTimeoutSeconds: 2,
                expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Hashed build assets never change content — serve from cache.
              urlPattern: /\/_build\/assets\/.*\.(?:js|css)$/,
              handler: "CacheFirst",
              options: {
                cacheName: "zq-build-assets",
                expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              urlPattern: /\.(?:js|css)$/,
              handler: "StaleWhileRevalidate",
              options: { cacheName: "zq-static" },
            },
            {
              urlPattern: /\.(?:woff2?|ttf|otf)$/,
              handler: "CacheFirst",
              options: {
                cacheName: "zq-local-fonts",
                expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|webp|avif|gif|svg|ico)$/,
              handler: "CacheFirst",
              options: {
                cacheName: "zq-images",
                expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//,
              handler: "CacheFirst",
              options: {
                cacheName: "zq-fonts",
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\//,
              handler: "CacheFirst",
              options: {
                cacheName: "zq-remote-media",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Read-only content queries: last good response keeps the UI usable offline.
              urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/rest\/v1\//,
              handler: "NetworkFirst",
              options: {
                cacheName: "zq-api",
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
                cacheableResponse: { statuses: [200] },
              },
            },
          ],

        },
      }),
    ],
  },
});
