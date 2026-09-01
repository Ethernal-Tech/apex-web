import { createFileRoute, Outlet } from "@tanstack/react-router";
import { FooterSocials } from "@/components/ui/footer-socials";
import { SiteHeader } from "@/components/SiteHeader";
import {
  ETHERNAL_GITHUB_URL,
  externalAnchorProps,
  SKYLINE_DOCUMENTATION_URL,
} from "@/lib/utils";

/**
 * The shell both `/blog` and `/blog/<slug>` render inside: same hero, same
 * panel. A post therefore opens in place, in the rectangle the list was just
 * occupying, while still having a URL of its own to link to.
 *
 * The head tags live on the two child routes rather than here, so a post can
 * carry its own title and description.
 */
export const Route = createFileRoute("/blog")({
  component: BlogShell,
});

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-hero-glow absolute inset-0 opacity-50" />
      <div className="container-page relative pb-8 pt-20 text-center md:pb-10 md:pt-28">
        <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Skyline Blog
        </div>
        <h1 className="text-balance font-display text-4xl font-semibold md:text-6xl">
          <span className="text-gradient-sky">Interoperability can’t wait</span>
        </h1>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-background">
      <div className="container-page py-14">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-start">
          <div className="max-w-sm">
            <div className="font-display text-lg font-semibold tracking-[0.3em] text-foreground">
              SKYLINE
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              The universal bridge between chains, agents, and the dollar
              economy.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {[
              {
                title: "Product",
                links: [
                  { label: "Bridge", href: "/bridge-app" },
                  { label: "Roadmap", href: "/roadmap" },
                  { label: "Agents", href: "#" },
                  { label: "TradFi", href: "#" },
                ],
              },
              {
                title: "Developers",
                links: [
                  { label: "Docs", href: SKYLINE_DOCUMENTATION_URL },
                  { label: "GitHub", href: ETHERNAL_GITHUB_URL },
                ],
              },
              {
                title: "Connect",
                links: [
                  { label: "Who We Are", href: "/about-us" },
                  { label: "Get in Touch", href: "/contact" },
                ],
              },
            ].map((c) => (
              <div key={c.title}>
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
                  {c.title}
                </div>
                <ul className="space-y-2">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        {...externalAnchorProps(l.href)}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-white/5 pt-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <div>© {new Date().getFullYear()} Skyline. All rights reserved.</div>
          <FooterSocials />
        </div>
      </div>
    </footer>
  );
}

function BlogShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <section className="pb-16 md:pb-20">
          <div className="container-page">
            <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur md:p-8">
              <Outlet />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
