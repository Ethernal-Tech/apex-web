import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FileText } from "lucide-react";
import { FooterSocials } from "@/components/ui/footer-socials";
import { SiteHeader } from "@/components/SiteHeader";
import { pageHead } from "@/lib/seo";
import { publicationUrl, type Publication } from "@/data/publications";
import { publicationsQueryOptions } from "@/lib/api/publications";
import {
  ETHERNAL_GITHUB_URL,
  externalAnchorProps,
  SKYLINE_DOCUMENTATION_URL,
} from "@/lib/utils";

export const Route = createFileRoute("/publications")({
  head: () =>
    pageHead({
      title: "Publications - Skyline",
      description:
        "Peer-reviewed papers from the team building Skyline: the cryptography, consensus and bridge research behind how the protocol moves value between chains.",
      path: "/publications",
    }),
  component: PublicationsPage,
});

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-hero-glow absolute inset-0 opacity-50" />
      <div className="container-page relative pb-8 pt-20 text-center md:pb-10 md:pt-28">
        <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Skyline Publications
        </div>
        <h1 className="text-balance font-display text-4xl font-semibold md:text-6xl">
          <span className="text-gradient-sky">The research behind it</span>
        </h1>
      </div>
    </section>
  );
}

/**
 * The tile down the left of every row. It carries no information the citation
 * beside it does not already give, so it is decorative - but it is also what
 * makes the list scan as a stack of papers rather than a stack of links.
 */
function PaperTile({ publication }: { publication: Publication }) {
  return (
    <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] transition-colors group-hover:border-[oklch(0.72_0.19_245_/_0.5)] md:h-20 md:w-20">
      <FileText
        className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-[oklch(0.85_0.15_235)] md:h-6 md:w-6"
        aria-hidden
      />
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {publication.kind}
      </span>
    </div>
  );
}

/** Title, then where it was published, then who wrote it. */
function Citation({ publication }: { publication: Publication }) {
  return (
    <div className="min-w-0">
      <h2 className="text-pretty font-display text-base font-semibold text-foreground transition-colors group-hover:text-[oklch(0.85_0.15_235)] md:text-lg">
        {publication.title}
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        <span className="italic">{publication.venue}</span>
        {publication.doi && (
          <>
            {" · "}
            {/* Wrapped so a long DOI breaks inside the row instead of widening it. */}
            <span className="break-all">DOI {publication.doi}</span>
          </>
        )}
      </p>
      {publication.authors.length > 0 && (
        <p className="mt-1 text-sm text-muted-foreground/80">
          {publication.authors.join(", ")}
        </p>
      )}
    </div>
  );
}

function PublicationRow({ publication }: { publication: Publication }) {
  const href = publicationUrl(publication);
  const content = (
    <>
      <PaperTile publication={publication} />
      <Citation publication={publication} />
      {href && (
        <ExternalLink
          className="ml-auto hidden h-4 w-4 shrink-0 self-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 md:block"
          aria-hidden
        />
      )}
    </>
  );

  // A paper with neither a DOI nor a URL is still worth listing; it just has
  // nowhere to send you, so it renders as the same row without the link.
  return (
    <article className="py-6 first:pt-0 last:pb-0">
      {href ? (
        <a
          href={href}
          {...externalAnchorProps(href)}
          className="group flex items-start gap-4 md:gap-6"
        >
          {content}
        </a>
      ) : (
        <div className="group flex items-start gap-4 md:gap-6">{content}</div>
      )}
    </article>
  );
}

function PublicationList() {
  const { data: publications } = useQuery(publicationsQueryOptions);

  if (publications.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        The first publication is on its way.
      </p>
    );
  }

  return (
    <div className="divide-y divide-white/5">
      {publications.map((publication) => (
        <PublicationRow key={publication.id} publication={publication} />
      ))}
    </div>
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

function PublicationsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <section className="pb-16 md:pb-20">
          <div className="container-page">
            <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur md:p-8">
              <PublicationList />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
