import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type RefObject } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { FooterSocials } from "@/components/ui/footer-socials";
import { SiteHeader } from "@/components/SiteHeader";
import {
  ETHERNAL_GITHUB_URL,
  externalAnchorProps,
  SKYLINE_DOCUMENTATION_URL,
} from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { pageHead } from "@/lib/seo";
import { milestones, type Milestone } from "@/data/roadmap";

export const Route = createFileRoute("/roadmap")({
  head: () =>
    pageHead({
      title: "Roadmap - Skyline",
      description:
        "What Skyline ships next: Polygon, Ethereum and Solana production integrations, native Bitcoin support, multi-hop routing and agentic payment rails, from Aug 2026 through H2 2028.",
      path: "/roadmap",
    }),
  component: RoadmapPage,
});

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/* ---------- curve geometry ---------- */

/**
 * The timeline is drawn in a fixed coordinate space and stretched to whatever
 * width it gets. Only X is scaled, so a Y in this space is also a Y in px -
 * that is what lets the SVG curve and the HTML cards share one set of numbers.
 */
const VB_W = 1100;
/** Height of one milestone row, in px and in curve units alike. */
const ROW = 460;
const X_LEFT = 150;
const X_RIGHT = 950;

/** Milestones alternate sides, so the curve weaves between two columns. */
function nodeX(index: number) {
  return index % 2 === 0 ? X_LEFT : X_RIGHT;
}

/**
 * One cubic per gap between milestones, with both control points pulled
 * vertically off their node. The curve therefore leaves and enters every node
 * straight down, which keeps the joins smooth and the nodes centred on it.
 *
 * The road runs in from above the first node and stops at the last one, so the
 * progress dot comes to rest on the final milestone. `h` stays the full height
 * of the rows regardless, which is what keeps a y here equal to a y in px.
 */
function buildCurve(count: number) {
  const h = count * ROW;
  let d = `M ${nodeX(0)} 0 L ${nodeX(0)} ${ROW / 2}`;
  for (let i = 1; i < count; i++) {
    const xPrev = nodeX(i - 1);
    const yPrev = (i - 1) * ROW + ROW / 2;
    const x = nodeX(i);
    const y = i * ROW + ROW / 2;
    const pull = (y - yPrev) * 0.55;
    d += ` C ${xPrev} ${yPrev + pull}, ${x} ${y - pull}, ${x} ${y}`;
  }
  return { d, h };
}

const CURVE = buildCurve(milestones.length);

/* ---------- pieces ---------- */

const NODE_CLASS =
  "absolute top-1/2 z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 transition-[transform,background-color,box-shadow] duration-300 ease-out";

/**
 * Colour and glow are inline styles rather than classes: as arbitrary values a
 * two-layer box-shadow reads as one unbroken 90-character token, and keeping
 * them off the class list leaves NODE_CLASS to carry the transform on its own.
 */
const NODE_IDLE = {
  backgroundColor: "oklch(0.28 0.02 262)",
  boxShadow: "0 0 0 5px oklch(1 0 0 / 0.03)",
};

const NODE_ACTIVE = {
  backgroundColor: "oklch(0.72 0.19 245)",
  boxShadow:
    "0 0 0 5px oklch(0.72 0.19 245 / 0.14), 0 0 22px 4px oklch(0.85 0.18 235 / 0.55)",
};

const TRAVELLER_CLASS =
  "pointer-events-none absolute z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[oklch(0.9_0.15_230)] shadow-[0_0_18px_6px_oklch(0.85_0.18_235_/_0.5)]";

/**
 * Whether the row has climbed past the fold. The bottom inset holds the reveal
 * back until the card is heading for the middle of the screen, so the eye is
 * drawn to the milestone the progress dot has just reached rather than to
 * whatever is peeking in at the bottom.
 */
function useInView(
  ref: RefObject<Element | null>,
  root: RefObject<Element | null>,
) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const target = ref.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { root: root.current, rootMargin: "0px 0px -35% 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [ref, root]);

  return inView;
}

function StatusBadge({ status }: { status: Milestone["status"] }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
        <Check className="h-3 w-3 shrink-0" />
        Completed
      </span>
    );
  }
  if (status === "in-progress") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.72_0.19_245_/_0.35)] bg-[oklch(0.72_0.19_245_/_0.12)] px-2.5 py-1 text-[11px] font-semibold text-[oklch(0.85_0.15_235)]">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[oklch(0.85_0.15_235)] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[oklch(0.85_0.15_235)]" />
        </span>
        In progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
      Planned
    </span>
  );
}

function MilestoneRow({
  item,
  index,
  scroller,
  reduce,
}: {
  item: Milestone;
  index: number;
  scroller: RefObject<HTMLDivElement | null>;
  reduce: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, scroller);
  const active = reduce || inView;
  // Node on the left of the curve puts the card on the right, and vice versa.
  const nodeLeft = index % 2 === 0;
  const Icon = item.icon;
  const nodeStyle = active ? NODE_ACTIVE : NODE_IDLE;
  const nodeScale = active ? "scale-[1.15]" : "scale-100";

  return (
    <div
      ref={ref}
      // Rows are exactly ROW tall from `md` up, where the curve is drawn against
      // them. Phones only get the straight rail, so there a long card may grow
      // its row instead of spilling out of it.
      className="relative flex min-h-[460px] snap-center items-center pl-14 md:h-[460px] md:pl-0"
    >
      <span
        aria-hidden
        style={nodeStyle}
        className={`left-6 md:hidden ${NODE_CLASS} ${nodeScale}`}
      />
      <span
        aria-hidden
        style={{ ...nodeStyle, left: `${(nodeX(index) / VB_W) * 100}%` }}
        className={`hidden md:block ${NODE_CLASS} ${nodeScale}`}
      />

      <div className="w-full md:grid md:grid-cols-2 md:gap-x-24">
        {/* The reveal sits on a wrapper so it never fights card-glow's own
            transition of transform and shadow on hover. The resting state is
            behind motion-safe rather than motion-reduce overrides, so a reader
            who asked for less motion sees the finished card in the very first
            paint instead of one frame of the animation. */}
        <div
          className={`motion-safe:transition-[opacity,transform] motion-safe:duration-700 motion-safe:ease-out ${
            nodeLeft ? "md:col-start-2" : "md:col-start-1"
          } ${
            active
              ? "translate-x-0 translate-y-0 opacity-100"
              : `motion-safe:translate-y-4 motion-safe:opacity-40 ${
                  nodeLeft
                    ? "motion-safe:translate-x-10"
                    : "motion-safe:-translate-x-10"
                }`
          }`}
        >
          <article
            className={`card-glow rounded-2xl p-6 hover:-translate-y-1 hover:shadow-[0_24px_60px_-24px_oklch(0.55_0.22_250_/_0.55)] ${
              nodeLeft ? "" : "md:text-right"
            }`}
          >
            <div
              className={`flex items-center gap-3 ${
                nodeLeft ? "" : "md:flex-row-reverse"
              }`}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[oklch(0.85_0.15_235)]">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {item.period}
              </span>
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold tracking-tight text-foreground">
              {item.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
            <div className={`mt-5 flex ${nodeLeft ? "" : "md:justify-end"}`}>
              <StatusBadge status={item.status} />
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

function Timeline({
  scroller,
}: {
  scroller: RefObject<HTMLDivElement | null>;
}) {
  const reduce = useMediaQuery(REDUCED_MOTION);
  const rowsRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const clipRef = useRef<SVGRectElement>(null);
  const curveDotRef = useRef<HTMLSpanElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const railDotRef = useRef<HTMLSpanElement>(null);

  // Scroll position is written straight to the DOM: at 60fps a state update per
  // frame would re-render every card on the page for a two-pixel move. It has
  // to be a passive effect - React attaches an ancestor's ref after a child's
  // layout effect has already run, so `scroller` is still empty at that point.
  useEffect(() => {
    const view = scroller.current;
    const rows = rowsRef.current;
    const path = pathRef.current;
    const clip = clipRef.current;
    const curveDot = curveDotRef.current;
    const rail = railRef.current;
    const railDot = railDotRef.current;
    if (!view || !rows || !path || !clip || !curveDot || !rail || !railDot) {
      return;
    }

    const total = path.getTotalLength();

    /**
     * How far along the curve the point at height `y` sits. The curve only ever
     * descends, so bisecting on y converges; 24 steps lands well inside a pixel
     * over a path this long.
     */
    const lengthAtY = (y: number) => {
      let lo = 0;
      let hi = total;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        if (path.getPointAtLength(mid).y < y) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    };

    /** Matches the curve from `md` up and can exceed it on phones. */
    let railH = rows.offsetHeight;

    const paint = (centre: number) => {
      const y = Math.min(Math.max(centre, 0), CURVE.h);
      const point = path.getPointAtLength(lengthAtY(y));
      curveDot.style.left = `${(point.x / VB_W) * 100}%`;
      curveDot.style.top = `${point.y}px`;
      // Clipping the painted curve at the dot's own y welds the tip of the line
      // to the dot however far the SVG has been stretched horizontally.
      clip.setAttribute("height", String(point.y));

      const railY = Math.min(Math.max(centre, 0), railH);
      rail.style.height = `${railY}px`;
      railDot.style.top = `${railY}px`;
    };

    if (reduce) {
      paint(Math.max(CURVE.h, railH));
      return;
    }

    let frame = 0;
    const measure = () => {
      frame = 0;
      const viewRect = view.getBoundingClientRect();
      const rowsRect = rows.getBoundingClientRect();
      // Progress tracks the middle of the screen, which is also where a
      // snap-centred row comes to rest.
      paint(viewRect.top + viewRect.height / 2 - rowsRect.top);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    const observer = new ResizeObserver(() => {
      railH = rows.offsetHeight;
      measure();
    });
    observer.observe(rows);
    view.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    measure();

    return () => {
      observer.disconnect();
      view.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [scroller, reduce]);

  return (
    <section className="relative pb-8 md:pb-12">
      <div ref={rowsRef} className="relative">
        {/* Phones: a straight rail down the left edge. */}
        <div
          aria-hidden
          className="absolute bottom-0 left-6 top-0 w-px -translate-x-1/2 bg-white/10 md:hidden"
        />
        <div
          ref={railRef}
          aria-hidden
          style={{ height: 0 }}
          className="absolute left-6 top-0 w-px -translate-x-1/2 bg-gradient-to-b from-[oklch(0.85_0.18_235)] to-[oklch(0.55_0.22_250)] md:hidden"
        />
        <span
          ref={railDotRef}
          aria-hidden
          style={{ top: 0 }}
          className={`left-6 md:hidden ${TRAVELLER_CLASS}`}
        />

        {/* Desktop: the serpentine curve. It stays in the layout on phones
            rather than being display:none, so its geometry can still be
            measured before the viewport ever grows past `md`. */}
        <svg
          aria-hidden
          viewBox={`0 0 ${VB_W} ${CURVE.h}`}
          preserveAspectRatio="none"
          style={{ height: CURVE.h }}
          className="pointer-events-none invisible absolute left-0 top-0 w-full md:visible"
        >
          <defs>
            <linearGradient id="roadmap-curve" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.85 0.18 235)" />
              <stop offset="100%" stopColor="oklch(0.55 0.22 250)" />
            </linearGradient>
            <clipPath id="roadmap-progress">
              <rect ref={clipRef} x="0" y="0" width={VB_W} height="0" />
            </clipPath>
          </defs>
          <path
            ref={pathRef}
            d={CURVE.d}
            fill="none"
            stroke="oklch(1 0 0 / 0.12)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={CURVE.d}
            fill="none"
            stroke="url(#roadmap-curve)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            clipPath="url(#roadmap-progress)"
          />
        </svg>
        <span
          ref={curveDotRef}
          aria-hidden
          style={{ left: `${(X_LEFT / VB_W) * 100}%`, top: 0 }}
          className={`hidden md:block ${TRAVELLER_CLASS}`}
        />

        {milestones.map((milestone, i) => (
          <MilestoneRow
            key={milestone.id}
            item={milestone}
            index={i}
            scroller={scroller}
            reduce={reduce}
          />
        ))}
      </div>
    </section>
  );
}

function Hero() {
  const completed = milestones.filter((m) => m.status === "completed").length;
  const inProgress = milestones.filter(
    (m) => m.status === "in-progress",
  ).length;
  const stats = [
    { label: "Milestones", value: String(milestones.length) },
    { label: "Delivered", value: String(completed) },
    { label: "In progress", value: String(inProgress) },
    { label: "Horizon", value: milestones[milestones.length - 1].period },
  ];

  return (
    <section className="relative flex min-h-[70svh] snap-start items-center overflow-hidden">
      <div className="bg-hero-glow absolute inset-0 opacity-60" />
      <div className="container-page relative py-24 md:py-32">
        <div className="mx-auto w-full max-w-[1100px]">
          <Link
            to="/"
            className="mb-8 flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" /> Back to home
          </Link>
          <div className="mb-5 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Roadmap
          </div>
          <h1 className="text-balance font-display text-4xl font-semibold md:text-6xl">
            <span className="text-gradient-sky">Where Skyline goes next</span>
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
            Every chain we connect, asset we carry and rail we settle over, in
            the order we plan to ship it. Dates are targets rather than
            promises: we move them when the engineering or an ecosystem tells us
            to, and we say so here when we do.
          </p>
          <div className="mt-12 grid max-w-3xl grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="font-display text-2xl font-semibold text-foreground md:text-3xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="relative overflow-hidden py-24 md:py-28">
      {/* Not bg-hero-glow: that utility centres its gradients on the top edge of
          its box, which is invisible on a hero starting at the top of the
          viewport but cuts a hard band across a section that starts mid-page.
          This one is centred on the section and fades out before any edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          // Wider than the section so it runs to both screen edges, but short
          // enough vertically to reach nothing at the top and bottom.
          background:
            "radial-gradient(ellipse 75% 40% at 50% 50%, oklch(0.55 0.22 250 / 0.34), oklch(0.85 0.18 235 / 0.12) 45%, transparent 72%)",
        }}
      />
      <div className="container-page relative text-center">
        <h2 className="text-balance font-display text-4xl font-semibold md:text-5xl">
          <span className="text-gradient-sky">
            Need something that isn’t on the list?
          </span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          Tell us which chain, asset or integration your product depends on and
          we’ll scope it with you.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/contact"
            className="btn-primary-glow inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
          >
            Get in touch <ArrowRight className="h-4 w-4 shrink-0" />
          </a>
          <a
            href={SKYLINE_DOCUMENTATION_URL}
            {...externalAnchorProps(SKYLINE_DOCUMENTATION_URL)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-medium hover:bg-white/[0.06]"
          >
            Read the docs
          </a>
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

function RoadmapPage() {
  const scrollRef = useRef<HTMLDivElement>(null);

  // The page scrolls inside this element rather than the window: that is what
  // lets the milestone rows snap to the centre of the screen, and it gives the
  // progress rail and the header a single element to measure against.
  return (
    <div
      ref={scrollRef}
      className="h-[100svh] snap-y snap-proximity overflow-y-auto overflow-x-hidden bg-background text-foreground"
    >
      <SiteHeader scrollRef={scrollRef} />
      <main>
        <Hero />
        <div className="container-page">
          <div className="mx-auto w-full max-w-[1100px]">
            <Timeline scroller={scrollRef} />
          </div>
        </div>
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
