// @lovable.dev/vite-tanstack-config already includes the following - do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
// The blog feed, so every post gets a prerendered page. Posts added to the
// live copy on GitHub after a build render client-side instead - see
// src/lib/api/blog.ts.
import blogFeed from "./src/data/blog-posts.json";

const PUBLIC_PATHS = [
  "/",
  "/about-us",
  "/blog",
  "/contact",
  "/audit",
  "/privacy-policy",
  "/roadmap",
  "/terms-of-service",
  "/transactions",
  "/bridge-app",
];

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    spa: {
      enabled: true,
      // maskPath must not be `/`: Start dedupes prerender jobs by path, so
      // prerendering `/` (the real home) would skip the shell (or vice versa).
      // `/landing` exists, is not in PUBLIC_PATHS, and returns 200.
      maskPath: "/landing",
      prerender: {
        // `_shell` → `_shell.html`. Nginx catch-all:
        //   try_files $uri $uri.html $uri/ /_shell.html;
        outputPath: "/_shell",
      },
    },
    // Write real HTML for public pages so Telegram/Google see the right title
    // without running JS. Deploy is still a static folder.
    prerender: {
      enabled: true,
      crawlLinks: false,
      autoStaticPathsDiscovery: false,
      failOnError: true,
      // about-us.html instead of about-us/index.html - pm2 serve returns 500
      // (EISDIR) when the URL matches a directory.
      autoSubfolderIndex: false,
    },
    pages: [
      ...PUBLIC_PATHS,
      ...blogFeed.posts.map((post) => `/blog/${post.slug}`),
    ].map((path) => ({ path })),
    sitemap: { enabled: false },
  },
  nitro: false,
});
