import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reactorValidatorStatusQueryOptions } from "../lib/api/reactorValidatorStatus";
import { WalletSessionProvider } from "../lib/wallet/WalletSessionProvider";
import { reportLovableError } from "../lib/lovable-error-reporting";
import CookieConsent from "../components/CookieConsent";
import { IntroAnimation } from "../components/IntroAnimation";
import { Toaster } from "../components/ui/sonner";
import { InitSentry } from "../lib/sentry";
import appSettings from "../settings/appSettings";
import { pageHead, SITE } from "../lib/seo";

function ReactorValidatorStatusPoller() {
  useQuery(reactorValidatorStatusQueryOptions());
  return null;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Page not found
        </h2>
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
          Something went wrong on our end. You can try refreshing or head back
          home.
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

const DEFAULT_HEAD = pageHead({
  title: SITE.name,
  description: SITE.description,
  path: "/",
});

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        ...DEFAULT_HEAD.meta,
        // Mirrored by theme_color/background_color in public/site.webmanifest,
        // so the mobile browser chrome, the installed-app splash screen, and the
        // page itself are all the same colour.
        { name: "theme-color", content: SITE.themeColor },
        // Mirrors short_name in the manifest — this is the iOS equivalent.
        { name: "apple-mobile-web-app-title", content: SITE.shortName },
      ],
      links: [
        // Only DEFAULT_HEAD.meta is spread here, never DEFAULT_HEAD.links.
        // Meta is deduped by name/property, so a route's title/description/og
        // override these defaults; links are concatenated instead, so spreading
        // them would leave every route with the root's `canonical` of "/" next
        // to its own — and Google ignores all of them when they conflict.
        // Every route sets its own head via pageHead(), so the canonical is
        // already covered.
        {
          rel: "stylesheet",
          href: appCss,
        },
        // Square artwork everywhere the icon is shown on its own edge-to-edge
        // (tab, taskbar, iOS/Android home screen). The one round icon is for
        // consumers that crop to a circle — chiefly Google Search results —
        // which is why it is the only 192px `rel="icon"`: tabs resolve to the
        // 16/32 entries above it, and Google prefers a multiple of 48px.
        {
          rel: "icon",
          href: "/favicon.ico",
          type: "image/x-icon",
          sizes: "16x16 24x24 32x32 48x48 64x64",
        },
        {
          rel: "icon",
          href: "/favicon-16x16.png",
          type: "image/png",
          sizes: "16x16",
        },
        {
          rel: "icon",
          href: "/favicon-32x32.png",
          type: "image/png",
          sizes: "32x32",
        },
        {
          rel: "icon",
          href: "/favicon-round-192x192.png",
          type: "image/png",
          sizes: "192x192",
        },
        {
          rel: "apple-touch-icon",
          href: "/apple-touch-icon.png",
          sizes: "180x180",
        },
        { rel: "manifest", href: "/site.webmanifest" },
        // The API is a separate origin and is on the critical path twice over:
        // every page fetches its settings and chain/token metadata from it, and
        // the chain and token logos those responses name are served from it too.
        // Warming the connection here overlaps that handshake with the bundle.
        {
          rel: "preconnect",
          href: appSettings.apiUrl,
          crossOrigin: "anonymous",
        },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossOrigin: "anonymous",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
        },
      ],
    }),
    shellComponent: RootShell,
    component: RootComponent,
    notFoundComponent: NotFoundComponent,
    errorComponent: ErrorComponent,
  },
);

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang={SITE.lang} className="dark">
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const showIntro =
    pathname === "/" || pathname === "/landing" || pathname === "/bridge-app";

  useEffect(() => {
    InitSentry();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <WalletSessionProvider>
        <ReactorValidatorStatusPoller />
        {showIntro && <IntroAnimation />}
        <Outlet />
        <Toaster />
        <CookieConsent />
      </WalletSessionProvider>
    </QueryClientProvider>
  );
}
