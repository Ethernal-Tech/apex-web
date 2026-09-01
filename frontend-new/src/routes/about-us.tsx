import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Shield,
  Zap,
  Globe,
  Bot,
  Landmark,
  GitBranch,
  Blocks,
  Building2,
  FileCheck2,
  LineChart,
} from "lucide-react";
import { FooterSocials } from "@/components/ui/footer-socials";
import { SiteHeader, type HeaderTheme } from "@/components/SiteHeader";
import {
  ETHERNAL_GITHUB_URL,
  externalAnchorProps,
  SKYLINE_DOCUMENTATION_URL,
} from "@/lib/utils";
import { settingsQueryOptions } from "@/lib/api/settings";
import { pageHead } from "@/lib/seo";
import heroImg from "@/assets/about/about-hero.jpg";
import teamImg from "@/assets/about/about-team.jpg";
import bladeLogo from "@/assets/projects/blade.svg";
import polygonEdgeLogo from "@/assets/projects/polygon-edge.svg";
import agglayerLogo from "@/assets/projects/agglayer.jpg";
import polygonLogo from "@/assets/projects/polygon.svg";
import availLogo from "@/assets/projects/avail.svg";
import gravityLogo from "@/assets/projects/gravity-bridge.svg";
import cosmosLogo from "@/assets/projects/cosmos.svg";
import hydroLogo from "@/assets/projects/hydro.svg";
import filecoinLogo from "@/assets/projects/filecoin.svg";
import apexLogo from "@/assets/projects/apex-fusion.svg";
import moduloLogo from "@/assets/projects/modulo.svg";
import teamSrdjan from "@/assets/about/team-srdjan.jpeg";
import teamNemanja from "@/assets/about/team-nemanja.jpeg";
import teamDarko from "@/assets/about/team-darko.jpeg";

export const Route = createFileRoute("/about-us")({
  head: () =>
    pageHead({
      title: "Who We Are - Skyline",
      description:
        "Skyline is the universal bridge for on-chain and real-world finance - connecting UTxO, EVM and SVM networks today, AI agents and fiat rails next.",
      path: "/about-us",
    }),
  component: AboutPage,
});

/**
 * Sections run the full height of the screen and pass under the translucent
 * header, so the header tints itself from whichever one is behind it instead
 * of showing the tail end of the previous section.
 */
function useHeaderTheme(scrollRef: RefObject<HTMLDivElement | null>) {
  const [theme, setTheme] = useState<HeaderTheme>("dark");

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let frame = 0;
    const probe = () => {
      frame = 0;
      const headerMiddle = container.getBoundingClientRect().top + 32;
      const sections = container.querySelectorAll<HTMLElement>("[data-header]");
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= headerMiddle && rect.bottom > headerMiddle) {
          setTheme(section.dataset.header === "light" ? "light" : "dark");
          return;
        }
      }
      setTheme("dark");
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(probe);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    probe();
    return () => {
      container.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [scrollRef]);

  return theme;
}

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Below this the text gets too small to read, so the section flows instead. */
const MIN_FIT_SCALE = 0.7;

/**
 * One snap point = one screen. When a section's content is taller than the
 * screen it is scaled down to fit, so every snap point lands on a full view.
 * Phones keep their natural flow - the sections there are several screens of
 * content and scaling them would shrink the text to nothing.
 */
function SnapSection({
  children,
  className = "",
  backdrop,
  headerTheme = "dark",
}: {
  children: ReactNode;
  className?: string;
  backdrop?: ReactNode;
  headerTheme?: HeaderTheme;
}) {
  const frameRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useIsomorphicLayoutEffect(() => {
    const frame = frameRef.current;
    const content = contentRef.current;
    if (!frame || !content) return;

    const fit = () => {
      if (!window.matchMedia("(min-width: 768px)").matches) {
        setScale(1);
        return;
      }
      // Read the slot from min-height, not from the frame's current height:
      // the frame only gets pinned while scaling, so measuring it would loop.
      // offsetHeight is the unscaled layout height, so it never feeds back.
      const frameStyle = getComputedStyle(frame);
      const slot =
        parseFloat(frameStyle.minHeight) - parseFloat(frameStyle.paddingTop);
      const ratio = slot / content.offsetHeight;
      setScale(ratio >= 1 || ratio < MIN_FIT_SCALE ? 1 : ratio);
    };

    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    observer.observe(content);
    fit();
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={frameRef}
      data-header={headerTheme}
      className={`relative flex min-h-[100svh] snap-start items-center pt-16 ${
        scale < 1 ? "overflow-hidden md:h-[100svh]" : ""
      } ${className}`}
    >
      {backdrop}
      <div
        ref={contentRef}
        style={scale < 1 ? { transform: `scale(${scale})` } : undefined}
        className="relative w-full origin-center"
      >
        {children}
      </div>
    </section>
  );
}

function Hero() {
  return (
    <SnapSection
      className="border-b border-white/5"
      backdrop={
        <>
          <img
            src={heroImg}
            alt="Abstract skyline of luminous data towers connected by arcs of light"
            width={1920}
            height={960}
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
          <div className="bg-hero-glow absolute inset-0 opacity-60" />
        </>
      }
    >
      <div className="container-page relative w-full py-16 text-center">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Who we are
        </div>
        <h1 className="text-balance font-display text-4xl font-semibold md:text-6xl">
          <span className="text-gradient-sky">When “bridged” isn’t enough</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
          Skyline is built by engineers who believe moving value between
          networks should feel like sending a message - instant, verifiable, and
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
    </SnapSection>
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
    { label: "Worlds bridged", value: "UTxO · EVM · SVM" },
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
  black,
  portrait,
}: {
  eyebrow: string;
  title: string;
  body: string[];
  image: string;
  alt: string;
  reverse?: boolean;
  cta?: { label: string; to: string };
  black?: boolean;
  portrait?: boolean;
}) {
  return (
    <SnapSection
      className={`border-b border-white/5 ${black ? "bg-black" : ""}`}
    >
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
        <figure
          className={`card-glow overflow-hidden rounded-2xl ${
            portrait ? "mx-auto w-full md:w-fit" : ""
          }`}
        >
          <img
            src={image}
            alt={alt}
            width={portrait ? 736 : 1536}
            height={portrait ? 1349 : 1024}
            loading="lazy"
            className={`object-cover ${
              portrait
                ? "h-auto w-full md:max-h-[72svh] md:w-auto"
                : "h-full w-full"
            }`}
          />
        </figure>
      </div>
    </SnapSection>
  );
}

function Audits() {
  const clients = [
    {
      name: "Polygon",
      url: "https://polygon.technology",
      scope: "Heimdall v2, ABCI++, Cosmos SDK modules, CometBFT fork, Bor",
      years: "2025",
    },
    {
      name: "dYdX",
      url: "https://dydx.exchange/",
      scope: "v4 chain modules, x/clob, liquidations, megavault, CosmWasm",
      years: "2023-2025",
    },
    {
      name: "Celestia",
      url: "https://celestia.org/",
      scope: "NMT and rsmt2d libraries, Blobstream, Rollkit, celestia-app",
      years: "2023-2024",
    },
    {
      name: "Stride",
      url: "https://stride.zone/",
      scope: "StakeIBC, autopilot, rate limiter, LSM, vault contracts",
      years: "2022-2025",
    },
    {
      name: "Osmosis",
      url: "https://osmosis.zone",
      scope: "Token factory, pools, concentrated liquidity, superfluid staking",
      years: "2022-2023",
    },
    {
      name: "Namada",
      url: "https://namada.net/",
      scope: "Multi-asset shielded pool, ABCI, IBC and MASP integration",
      years: "2023-2024",
    },
    {
      name: "Neutron",
      url: "https://neutron.org/",
      scope: "Protocol analysis, flashloans, state verifier, MM vault contract",
      years: "2023-2025",
    },
    {
      name: "Union",
      url: "https://union.build/",
      scope: "IBC in Solidity, CometBLS, uniond, Cosmos SDK fork",
      years: "2024",
    },
    {
      name: "Gear-Vara",
      url: "https://vara.network/",
      scope: "Vara bridges, ZK prover and Ethereum smart contracts",
      years: "2024-2025",
    },
    {
      name: "Apex Nexus EVM Chain",
      url: "https://apexfusion.org/",
      scope: "IBFT, Nexus consensus layer and engine, Route3 wallet",
      years: "2024-2025",
    },
    {
      name: "Figure",
      url: "https://www.figure.com/",
      scope: "Provenance smart contracts, ATS and funding trading bridge",
      years: "2023-2024",
    },
    {
      name: "Archway",
      url: "https://archway.io/",
      scope: "Vesting and withdrawal contracts, callback, CWfees, CWica",
      years: "2023-2024",
    },
    {
      name: "Polymer",
      url: "https://www.polymerlabs.org",
      scope: "IBC cross-chain communication, vIBC contracts, light clients",
      years: "2024",
    },
    {
      name: "Router",
      url: "https://www.routerprotocol.com/",
      scope: "Router chain modules, gateway and asset bridge contracts",
      years: "2023",
    },
    {
      name: "Babylon",
      url: "https://babylonlabs.io",
      scope: "Genesis V2 upgrade",
      years: "2025",
    },
    {
      name: "Ripple EVM Sidechain",
      url: "https://www.xrplevm.org/",
      scope: "XRPL EVM node and EVMOS blockchain client",
      years: "2025",
    },
    {
      name: "Skip",
      url: "https://skip.money/",
      scope: "MEV Tendermint, Slinky distributed oracle",
      years: "2023",
    },
    {
      name: "Duality",
      url: "https://duality.xyz/",
      scope: "DEX combining AMM and order book design, incentives module",
      years: "2023",
    },
    {
      name: "Interchain Foundation",
      url: "https://interchain.io/",
      scope: "Interchain Security modules",
      years: "2023",
    },
    {
      name: "Axelar",
      url: "https://axelar.network",
      scope: "axelarnet",
      years: "2023",
    },
    {
      name: "B-Harvest",
      url: "https://bharvest.io/",
      scope: "Precompiles and x/inflation",
      years: "2025",
    },
    {
      name: "Icon",
      url: "https://icon.community/",
      scope: "IBC implementation",
      years: "2023",
    },
    {
      name: "Timewave",
      url: "https://timewave.computer/",
      scope: "Stride LP covenant",
      years: "2023",
    },
  ];

  const stats = [
    { value: "79", label: "Audit engagements" },
    { value: "23", label: "Protocols reviewed" },
    { value: "2022", label: "Auditing since" },
  ];

  return (
    <SnapSection className="border-b border-white/5">
      <div className="container-page w-full py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.85_0.15_235)]">
            Security audits
          </div>
          <h2 className="font-display text-3xl font-semibold text-foreground md:text-4xl">
            Security proven on other teams’ code
          </h2>
          <p className="mt-4 text-sm text-muted-foreground md:text-base">
            Our engineers are paid to break consensus layers, bridges and smart
            contracts that other protocols run in production. That review
            discipline is what secures this bridge.
          </p>
        </div>
        <div className="mx-auto mt-8 flex max-w-lg items-start justify-center gap-10">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-display text-2xl font-semibold text-foreground md:text-3xl">
                {s.value}
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {clients.map((c) => (
            <a
              key={c.name}
              href={c.url}
              {...externalAnchorProps(c.url)}
              className="group border-t border-white/10 pt-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-foreground transition-colors group-hover:text-[oklch(0.85_0.15_235)]">
                  {c.name}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {c.years}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {c.scope}
              </p>
            </a>
          ))}
        </div>
        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          Some engagements were delivered in partnership with Informal Systems.
        </p>
      </div>
    </SnapSection>
  );
}

function Projects() {
  const [flipped, setFlipped] = useState<string | null>(null);

  const projects: {
    name: string;
    text: string;
    image?: string;
    icon?: typeof Blocks;
  }[] = [
    {
      name: "Blade",
      image: bladeLogo,
      text: "A high-performance, EVM-compatible blockchain designed for enterprise-grade applications.",
    },
    {
      name: "Polygon Edge",
      image: polygonEdgeLogo,
      text: "The Polygon protocol layer that serves as the core system of the Polygon ecosystem.",
    },
    {
      name: "Polygon AggLayer",
      image: agglayerLogo,
      text: "A cross-chain settlement layer connecting the liquidity and users of any blockchain.",
    },
    {
      name: "Polygon OMS",
      image: polygonLogo,
      text: "Open Money Stack: one enterprise API linking fiat rails - ACH, wire, SWIFT - with instant stablecoin settlement.",
    },
    {
      name: "Avail",
      image: availLogo,
      text: "A data availability layer in the Polygon ecosystem, built to serve rollups.",
    },
    {
      name: "Cosmos Hub",
      image: cosmosLogo,
      text: "Maintenance of the Cosmos SDK and the IBC protocol, plus bug fixes and security patches for the Hub.",
    },
    {
      name: "Gravity Bridge",
      image: gravityLogo,
      text: "A bridge between Ethereum and Cosmos SDK chains, designed for maximum simplicity and efficiency.",
    },
    {
      name: "Filecoin FVM",
      image: filecoinLogo,
      text: "Audits and smart contract library design and development for the Filecoin Virtual Machine.",
    },
    {
      name: "Cosmos Hydro",
      image: hydroLogo,
      text: "A platform where ATOM stakers lock tokens for voting power and back bids for protocol-owned liquidity.",
    },
    {
      name: "Apex Fusion",
      image: apexLogo,
      text: "Core development of the Cardano-EVM bridge connecting the Prime, Vector and Nexus chains.",
    },
    {
      name: "Interchain Security",
      image: cosmosLogo,
      text: "The Cosmos take on shared security, letting chains lease their security to consumer chains.",
    },
    {
      name: "Modulo Finance",
      image: moduloLogo,
      text: "Vault infrastructure to hold, swap and transfer assets on Canton without ever handling private keys.",
    },
    {
      name: "Blockchain Explorer",
      icon: Blocks,
      text: "Block explorers for EVM chains and for Cardano.",
    },
    {
      name: "Fluxion RWA",
      icon: Building2,
      text: "A marketplace platform for real-world assets.",
    },
    {
      name: "Verifiable Invoice Financing",
      icon: FileCheck2,
      text: "An invoice financing solution that verifies invoices with a zero-knowledge proof protocol.",
    },
    {
      name: "11D Terminal",
      icon: LineChart,
      text: "A multi-chain portfolio platform with tax reporting, cost-basis tracking and institutional-grade analytics.",
    },
  ];

  return (
    <SnapSection className="border-b border-white/5">
      <div className="container-page w-full py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.85_0.15_235)]">
            Track record
          </div>
          <h2 className="font-display text-3xl font-semibold text-foreground md:text-4xl">
            The protocols we have already built
          </h2>
          <p className="mt-4 text-sm text-muted-foreground md:text-base">
            Core infrastructure across the Polygon, Cosmos, Filecoin and Cardano
            ecosystems. Hover a project to see what we worked on.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {projects.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() =>
                setFlipped((current) => (current === p.name ? null : p.name))
              }
              aria-label={`${p.name}: ${p.text}`}
              className="group aspect-square w-full cursor-pointer perspective-[1000px] sm:aspect-[4/3] lg:aspect-[2/1]"
            >
              <div
                className={`relative h-full w-full transition-transform duration-500 transform-3d group-hover:rotate-y-180 group-focus-visible:rotate-y-180 ${
                  flipped === p.name ? "rotate-y-180" : ""
                }`}
              >
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-white/10 bg-white p-6 backface-hidden">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      loading="lazy"
                      className="max-h-16 w-full object-contain lg:max-h-20"
                    />
                  ) : (
                    p.icon && (
                      <p.icon
                        className="h-11 w-11 text-neutral-800"
                        strokeWidth={1.25}
                      />
                    )
                  )}
                </div>
                <div className="card-glow absolute inset-0 flex rotate-y-180 flex-col justify-center gap-1.5 rounded-2xl p-4 text-left backface-hidden lg:gap-2 lg:p-5">
                  <div className="font-display text-[13px] font-semibold text-foreground lg:text-sm">
                    {p.name}
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground lg:text-xs">
                    {p.text}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </SnapSection>
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
      text: "UTxO, EVM, SVM - we treat each execution model on its own terms instead of forcing one design onto all of them.",
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
    <SnapSection className="border-b border-white/5">
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
    </SnapSection>
  );
}

function Team() {
  const team = [
    {
      name: "Srdjan Vukmirovic",
      image: teamSrdjan,
      // role: "Technical lead - protocol & validators",
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
    <SnapSection className="border-b border-white/5">
      <div className="container-page w-full py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.85_0.15_235)]">
            The people
          </div>
          <h2 className="font-display text-3xl font-semibold text-foreground md:text-4xl">
            Serious team, serious infrastructure
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
    </SnapSection>
  );
}

function CTA() {
  // The glow reaches the top of the view so the header floats over it the way
  // it does on the hero, instead of the glow cutting a seam below it. The extra
  // top padding stands in for the header's height.
  return (
    <section className="relative flex flex-1 items-center overflow-hidden pb-20 pt-36 [@media(max-height:820px)]:pb-14 [@media(max-height:820px)]:pt-30">
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

function AboutPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerTheme = useHeaderTheme(scrollRef);

  return (
    <div
      ref={scrollRef}
      className="h-[100svh] snap-y snap-mandatory overflow-y-auto bg-background text-foreground"
    >
      <SiteHeader theme={headerTheme} scrollRef={scrollRef} />
      <main>
        <Hero />
        <Split
          eyebrow="The team"
          title="Built by people who have done this before"
          body={[
            "The team behind Skyline has substantial relevant experience and has built this kind of technology before. It represents a perfect match of industry project leaders and exceptionally skilled engineers working on the development of relevant blockchain projects.",
            "That combination matters more than it sounds. Cross-chain infrastructure touches consensus, cryptography and custody at the same time, and every assumption you make is eventually tested by someone with real money on the line. Our engineers have shipped validators, relayers and settlement systems that run in production, while our project leads have taken protocols all the way from research to audited mainnet releases.",
            "We work in the open, review each other’s code, and treat security as a design constraint rather than a final checklist - the same discipline we brought to the networks we helped build long before Skyline.",
          ]}
          image={teamImg}
          alt="Skyline engineers reviewing system architecture together in a meeting room"
          reverse
          black
          portrait
        />
        <Projects />
        <Audits />
        <Values />
        <Team />
        <div
          data-header="dark"
          className="flex min-h-[100svh] snap-start flex-col"
        >
          <CTA />
          <Footer />
        </div>
      </main>
    </div>
  );
}
