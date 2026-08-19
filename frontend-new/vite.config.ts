// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const PUBLIC_PATHS = [
  "/",
  "/about-us",
  "/contact",
  "/audit",
  "/privacy-policy",
  "/terms-of-service",
];

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    spa: {
      enabled: true,
      prerender: { outputPath: "/index.html" },
    },
    // Write real HTML for public pages so Telegram/Google see the right title
    // without running JS. Deploy is still a static folder.
    prerender: {
      enabled: true,
      crawlLinks: false,
      autoStaticPathsDiscovery: false,
      failOnError: true,
    },
    pages: PUBLIC_PATHS.map((path) => ({ path })),
    sitemap: { enabled: false },
  },
  nitro: false,
});
