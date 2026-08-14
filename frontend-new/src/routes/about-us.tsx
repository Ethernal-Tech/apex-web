import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Shield,
  Zap,
  Globe,
  Bot,
  Landmark,
  GitBranch,
} from "lucide-react";
import { FooterSocials } from "@/components/ui/footer-socials";
import {
  ETHERNAL_GITHUB_URL,
  externalAnchorProps,
  SKYLINE_DOCUMENTATION_URL,
} from "@/lib/utils";
import { settingsQueryOptions } from "@/lib/api/settings";
import logoAsset from "@/assets/skyline-logo-transparent.png";
import heroImg from "@/assets/about/about-hero.jpg";
import bridgeImg from "@/assets/about/about-bridge.jpg";
import agentsImg from "@/assets/about/about-agents.jpg";
import tradfiImg from "@/assets/about/about-tradfi.jpg";
import teamSrdjan from "@/assets/about/team-srdjan.jpeg";
import teamNemanja from "@/assets/about/team-nemanja.jpeg";
import teamDarko from "@/assets/about/team-darko.jpeg";

export const Route = createFileRoute("/about-us")({
  head: () => ({
    meta: [
      { title: "Who We Are — Skyline Bridge" },
      {
        name: "description",
        content:
          "Skyline is the universal bridge for on-chain and real-world finance — connecting UTxO and EVM networks today, AI agents and fiat rails next.",
      },
      { property: "og:title", content: "Who We Are — Skyline Bridge" },
      {
        property: "og:description",
        content:
          "Meet the team building Skyline: trust-minimised cross-chain bridging, agentic finance, and stablecoin rails for traditional finance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/70 backdrop-blur-xl">
      <div className="relative flex h-16 w-full items-center justify-between gap-4 px-4 md:px-8">
        <Link
          to="/"
          className="flex items-center gap-2"
          aria-label="Skyline home"
        >
          <img src={logoAsset} alt="Skyline" className="h-8 w-auto md:h-9" />
        </Link>
        <nav className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-8 md:flex">
          <Link
            to="/"
            className="pointer-events-auto text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Home
          </Link>
          <Link
            to="/bridge-app"
            className="pointer-events-auto text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Bridge
          </Link>
          <Link
            to="/audit"
            className="pointer-events-auto text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Audit
          </Link>
        </nav>
        <div className="hidden items-center justify-end gap-3 md:flex">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.06]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] snap-start items-center overflow-hidden border-b border-white/5">
      <img
        src={heroImg}
        alt="Abstract skyline of luminous data towers connected by arcs of light"
        width={1920}
        height={960}
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="bg-hero-glow absolute inset-0 opacity-60" />
      <div className="container-page relative w-full py-16 text-center">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Who we are
        </div>
        <h1 className="text-balance font-display text-4xl font-semibold md:text-6xl">
          <span className="text-gradient-sky">When “bridged” isn’t enough</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
          Skyline is built by engineers who believe moving value between
          networks should feel like sending a message — instant, verifiable, and
          boring in the best possible way. We connect every chain, every agent,
          and every dollar.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/bridge-app"
            className="btn-primary-glow inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
          >
            Launch Bridge <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/audit"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-medium hover:bg-white/[0.06]"
          >
            See the proof of reserves
          </Link>
        </div>
        <Stats />
      </div>
    </section>
  );
}

function Stats() {
  const { data: settings } = useQuery(settingsQueryOptions);
  const chainsConnected = settings?.enabledChains.length;

  const stats = [
    {
      label: "Networks connected",
      value: chainsConnected != null ? String(chainsConnected) : "—",
    },
    { label: "Worlds bridged", value: "UTxO ↔ EVM" },
    { label: "Custody model", value: "Non-custodial" },
    { label: "Reserves published", value: "Live, on-chain" },
  ];
  return (
    <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-6 md:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="px-2 text-center">
          <div className="font-display text-2xl font-semibold text-foreground md:text-3xl">
            {s.value}
          </div>
          <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function Split({
  eyebrow,
  title,
  body,
  image,
  alt,
  reverse,
  cta,
}: {
  eyebrow: string;
  title: string;
  body: string[];
  image: string;
  alt: string;
  reverse?: boolean;
  cta?: { label: string; to: string };
}) {
  return (
    <section className="flex min-h-[calc(100svh-4rem)] snap-start items-center border-b border-white/5">
      <div
        className={`container-page grid w-full items-center gap-10 py-16 md:grid-cols-2 md:gap-14 ${
          reverse ? "md:[&>figure]:order-first" : ""
        }`}
      >
        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.85_0.15_235)]">
            {eyebrow}
          </div>
          <h2 className="font-display text-3xl font-semibold text-foreground md:text-4xl">
            {title}
          </h2>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base">
            {body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          {cta && (
            <Link
              to={cta.to}
              className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-medium hover:bg-white/[0.06]"
            >
              {cta.label} <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        <figure className="card-glow overflow-hidden rounded-2xl">
          <img
            src={image}
            alt={alt}
            width={1536}
            height={1024}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </figure>
      </div>
    </section>
  );
}

function Values() {
  const values = [
    {
      icon: Shield,
      title: "Verifiable by default",
      text: "Every locked and bridged token is published on our audit page. Trust is something you can check, not something we ask for.",
    },
    {
      icon: Zap,
      title: "Speed without shortcuts",
      text: "Transfers settle in seconds, but never at the cost of finality. We wait for the chain when the chain needs waiting for.",
    },
    {
      icon: Globe,
      title: "Chain-agnostic",
      text: "UTxO, EVM, SVM — we treat each execution model on its own terms instead of forcing one design onto all of them.",
    },
    {
      icon: GitBranch,
      title: "Open engineering",
      text: "Contracts, relayers, and validator logic are built to be reviewed, reproduced, and challenged by anyone.",
    },
    {
      icon: Bot,
      title: "Built for machines too",
      text: "Humans click buttons; agents call APIs. Skyline is designed so both can move value with the same guarantees.",
    },
    {
      icon: Landmark,
      title: "Ready for real money",
      text: "Stablecoin and card rails are a first-class part of the roadmap, not an afterthought bolted on later.",
    },
  ];
  return (
    <section className="flex min-h-[calc(100svh-4rem)] snap-start items-center border-b border-white/5">
      <div className="container-page w-full py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.85_0.15_235)]">
            What we stand for
          </div>
          <h2 className="font-display text-3xl font-semibold text-foreground md:text-4xl">
            Principles we refuse to trade away
          </h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((v) => (
            <div key={v.title} className="card-glow rounded-2xl p-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[oklch(0.85_0.15_235)]">
                <v.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
                {v.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {v.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Team() {
  const team = [
    {
      name: "Srdjan Vukmirovic",
      image: teamSrdjan,
      // role: "Technical lead — protocol & validators",
      text: "Srdjan, a full professor at the Faculty of Technical Sciences, University of Novi Sad, teaches Cloud Computing, AI and Blockchain, and leads technology across several startups with a focus on promoting new ways of thinking about innovation.",
    },
    {
      name: "Nemanja Nedic",
      image: teamNemanja,
      // role: "Bridge app, audit & history",
      text: "Nemanja, a professor at the Faculty of Technical Sciences, University of Novi Sad, brings a wealth of expertise in technical problem-solving and effective team management cultivated through years of professional experience.",
    },
    {
      name: "Darko Capko",
      image: teamDarko,
      // role: "Next-generation rails",
      text: "Darko, a full professor at the Faculty of Technical Sciences, University of Novi Sad, teaches modeling, optimization, AI and machine learning, and brings two decades of experience architecting large-scale SCADA and smart grid systems.",
    },
  ];
  return (
    <section className="flex min-h-[calc(100svh-4rem)] snap-start items-center border-b border-white/5">
      <div className="container-page w-full py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.85_0.15_235)]">
            The people
          </div>
          <h2 className="font-display text-3xl font-semibold text-foreground md:text-4xl">
            Small team, serious infrastructure
          </h2>
          <p className="mt-4 text-sm text-muted-foreground md:text-base">
            Skyline is built by a compact group of protocol, security, and
            product engineers who have shipped production systems where downtime
            is not an option.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {team.map((t) => (
            <div
              key={t.name}
              className="card-glow flex flex-col overflow-hidden rounded-2xl"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={t.image}
                  alt={t.name}
                  width={800}
                  height={600}
                  loading="lazy"
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {t.name}
                </h3>
                {/* <div className="mt-1 text-xs uppercase tracking-wider text-[oklch(0.85_0.15_235)]">{t.role}</div> */}
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {t.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="relative flex flex-1 items-center overflow-hidden py-20">
      <div className="bg-hero-glow absolute inset-0 opacity-70" />
      <div className="container-page relative text-center">
        <h2 className="text-balance font-display text-4xl font-semibold md:text-5xl">
          <span className="text-gradient-sky">
            Let’s cross the horizon together.
          </span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          Partner with us, integrate the bridge, or just say hello.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/contact"
            className="btn-primary-glow inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
          >
            Get in touch <ArrowRight className="h-4 w-4" />
          </a>
          <Link
            to="/bridge-app"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-medium hover:bg-white/[0.06]"
          >
            Open the bridge
          </Link>
        </div>
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

function AboutPage() {
  return (
    <div className="h-[100svh] snap-y snap-mandatory overflow-y-auto bg-background text-foreground [&>section]:scroll-mt-16 [&_section]:scroll-mt-16">
      <Header />
      <main>
        <Hero />
        <Split
          eyebrow="The origin"
          title="Bridges shouldn’t be the weakest link"
          body={[
            "Skyline started with a simple frustration: the fastest way to lose money in crypto was to move it. Bridges were opaque, custodial, slow, and — too often — the headline of the next exploit.",
            "So we rebuilt the flow from the lock contract up. Assets are locked and minted through a verifiable, non-custodial pipeline that spans UTxO chains like Prime and Vector and EVM networks like Nexus, with reserves published live for anyone to audit.",
          ]}
          image={bridgeImg}
          alt="Glowing arc of light bridging two blockchain node networks"
          cta={{ label: "View live reserves", to: "/audit" }}
        />
        <Split
          eyebrow="What’s next"
          title="Finance that agents can operate"
          body={[
            "The next wave of on-chain activity won’t be typed into a form — it will be initiated by autonomous agents rebalancing, settling, and routing liquidity around the clock.",
            "We’re making Skyline machine-native: deterministic quotes, programmatic transfer intents, and guardrails that let an agent move value across chains with the same safety envelope a human gets in the app.",
          ]}
          image={agentsImg}
          alt="Network of connected AI agent nodes exchanging data"
          reverse
        />
        <Split
          eyebrow="The bigger picture"
          title="Connecting the dollar economy"
          body={[
            "Cross-chain liquidity only matters if it can reach the real world. That means stablecoins, card rails, and payout networks sitting on the same side of the bridge as your on-chain balance.",
            "Our TradFi track brings fiat on- and off-ramps into the Skyline flow, so a transfer can start as a card payment and end as a token on the chain of your choice — with one audit trail across the whole journey.",
          ]}
          image={tradfiImg}
          alt="Digital dollar and stablecoin flowing along light rails into a blockchain grid"
        />
        <Values />
        <Team />
        <div className="flex min-h-[calc(100svh-4rem)] snap-start scroll-mt-16 flex-col">
          <CTA />
          <Footer />
        </div>
      </main>
    </div>
  );
}
