import { useState, type ReactNode, type RefObject } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import {
  ArrowLeftRight,
  ArrowRight,
  BookOpen,
  Bot,
  ChevronDown,
  ExternalLink,
  FileText,
  Github,
  Landmark,
  Map,
  Menu,
  Newspaper,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import logoAsset from "@/assets/skyline-logo-transparent.png";
import { useHeadroom } from "@/hooks/use-headroom";
import {
  ETHERNAL_GITHUB_URL,
  externalAnchorProps,
  SKYLINE_DOCUMENTATION_URL,
} from "@/lib/utils";
import { SOCIAL_LINKS } from "@/components/ui/footer-socials";
import { milestonePeriod } from "@/data/roadmap";

/* ---------- the menu every marketing page shares ---------- */

type NavEntry = {
  label: string;
  icon: LucideIcon;
  /** The line under the label. `soon` takes its place when set. */
  blurb?: string;
  /** An internal route. */
  to?: LinkProps["to"];
  /** An external URL. */
  href?: string;
  /** Set instead of a destination, for a surface that does not exist yet. */
  soon?: string;
};

/**
 * The roadmap milestone each unshipped product surface is waiting on, so the
 * dates in this menu follow /roadmap instead of drifting from it. If a surface
 * moves to a different milestone, change the id here and nothing else.
 */
const AGENTS_MILESTONE = "ai-agent-access";
const TRADFI_MILESTONE = "tempo-integration";

function coming(milestoneId: string) {
  const period = milestonePeriod(milestoneId);
  return period ? `Coming ${period}` : "Coming soon";
}

/** Legal pages, small enough to live in a menu footer rather than a row. */
const LEGAL_LINKS: { label: string; to: LinkProps["to"] }[] = [
  { label: "Terms", to: "/terms-of-service" },
  { label: "Privacy", to: "/privacy-policy" },
];

const NAV_GROUPS: {
  label: string;
  /** How many columns the dropdown lays its entries out in. */
  columns?: 1 | 2;
  /** Adds the legal links and socials strip under the entries. */
  footer?: boolean;
  entries: NavEntry[];
}[] = [
  {
    label: "Product",
    entries: [
      {
        label: "Bridge",
        icon: ArrowLeftRight,
        blurb: "Move tokens across chains",
        to: "/bridge-app",
      },
      { label: "Agents", icon: Bot, soon: coming(AGENTS_MILESTONE) },
      { label: "TradFi", icon: Landmark, soon: coming(TRADFI_MILESTONE) },
    ],
  },
  {
    label: "Resources",
    columns: 2,
    footer: true,
    entries: [
      {
        label: "About",
        icon: Users,
        blurb: "The people behind Skyline",
        to: "/about-us",
      },
      {
        label: "Roadmap",
        icon: Map,
        blurb: "Milestones and target dates",
        to: "/roadmap",
      },
      {
        label: "Blog",
        icon: Newspaper,
        blurb: "Notes from the team",
        to: "/blog",
      },
      { label: "Publications", icon: FileText, soon: "Coming soon" },
      {
        label: "Docs",
        icon: BookOpen,
        blurb: "Guides and API reference",
        href: SKYLINE_DOCUMENTATION_URL,
      },
      {
        label: "GitHub",
        icon: Github,
        blurb: "Source code and issues",
        href: ETHERNAL_GITHUB_URL,
      },
    ],
  },
];

/*
 * Two breakpoints run through the markup below, spelled out literally at every
 * use site because Tailwind only generates classes it can see in the source:
 *
 *   min-[900px]   the two menus and the CTA fit beside the logo; under it they
 *                 fold into the burger.
 *   min-[1120px]  the live figures fit beside the CTA too; under it they take
 *                 their own row under the bar.
 */

export type HeaderTheme = "dark" | "light";

/* ---------- entries ---------- */

const ROW_CLASS =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 outline-none transition-colors";

function rowClass(light: boolean, pending: boolean) {
  if (pending) return `${ROW_CLASS} cursor-default`;
  return `${ROW_CLASS} ${
    light
      ? "hover:bg-black/[0.05] focus-visible:bg-black/[0.05]"
      : "hover:bg-white/[0.06] focus-visible:bg-white/[0.06]"
  }`;
}

/** Icon, label, and one line saying what it is or when it lands. */
function EntryBody({ entry, light }: { entry: NavEntry; light: boolean }) {
  const pending = Boolean(entry.soon);
  const Icon = entry.icon;
  // Same test the anchor uses, so the hint appears exactly when a new tab opens.
  const opensNewTab = Boolean(
    entry.href && externalAnchorProps(entry.href).target,
  );
  return (
    <>
      <span
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
          light
            ? "border-black/10 bg-black/[0.04]"
            : "border-white/10 bg-white/5"
        }`}
      >
        <Icon
          aria-hidden
          className={`h-4 w-4 shrink-0 ${
            pending
              ? light
                ? "text-neutral-400"
                : "text-muted-foreground/60"
              : light
                ? "text-[oklch(0.5_0.19_262)]"
                : "text-[oklch(0.85_0.15_235)]"
          }`}
        />
      </span>
      <span className="min-w-0">
        <span
          className={`flex items-center gap-1 text-sm font-medium ${
            light
              ? pending
                ? "text-neutral-500"
                : "text-neutral-900"
              : pending
                ? "text-foreground/60"
                : "text-foreground"
          }`}
        >
          {entry.label}
          {opensNewTab && (
            <ExternalLink aria-hidden className="h-3 w-3 shrink-0 opacity-55" />
          )}
        </span>
        <span
          className={`mt-0.5 block text-xs ${
            light ? "text-neutral-500" : "text-muted-foreground"
          }`}
        >
          {entry.soon ?? entry.blurb}
        </span>
      </span>
    </>
  );
}

function MenuEntry({
  entry,
  light,
  inMenu,
  onNavigate,
}: {
  entry: NavEntry;
  light: boolean;
  /**
   * Inside the desktop NavigationMenu, links go through `NavigationMenu.Link`
   * so activating one dismisses the dropdown. That primitive needs the menu's
   * context, so the burger panel - which has none - renders them bare.
   */
  inMenu?: boolean;
  onNavigate?: () => void;
}) {
  // Nothing to activate yet, so this is text rather than a dead link.
  if (entry.soon) {
    return (
      <div className={rowClass(light, true)}>
        <EntryBody entry={entry} light={light} />
      </div>
    );
  }

  let link: ReactNode;
  if (entry.href) {
    link = (
      <a
        href={entry.href}
        {...externalAnchorProps(entry.href)}
        onClick={onNavigate}
        className={rowClass(light, false)}
      >
        <EntryBody entry={entry} light={light} />
      </a>
    );
  } else if (entry.to) {
    link = (
      <Link
        to={entry.to}
        onClick={onNavigate}
        className={rowClass(light, false)}
      >
        <EntryBody entry={entry} light={light} />
      </Link>
    );
  } else {
    return null;
  }

  return inMenu ? (
    <NavigationMenu.Link asChild>{link}</NavigationMenu.Link>
  ) : (
    link
  );
}

/**
 * The strip under a menu's entries: legal links on the left, socials on the
 * right, split off by a rule in the same muted tone as the entry blurbs.
 */
function MenuFooter({
  light,
  inMenu,
  onNavigate,
}: {
  light: boolean;
  inMenu?: boolean;
  onNavigate?: () => void;
}) {
  const muted = light ? "text-neutral-500" : "text-muted-foreground";
  const hover = light ? "hover:text-neutral-900" : "hover:text-foreground";
  // Inside the dropdown every link has to dismiss it on activation; the burger
  // panel has no NavigationMenu context, so there it stays a bare element.
  const wrap = (node: ReactNode) =>
    inMenu ? <NavigationMenu.Link asChild>{node}</NavigationMenu.Link> : node;

  return (
    <div
      className={`mt-1.5 flex items-center justify-between gap-4 border-t px-3 pb-1 pt-2.5 ${
        light ? "border-neutral-500/25" : "border-muted-foreground/25"
      }`}
    >
      <div className={`flex items-center gap-4 text-xs ${muted}`}>
        {LEGAL_LINKS.map((l) => (
          <span key={l.label}>
            {wrap(
              <Link
                to={l.to}
                onClick={onNavigate}
                className={`transition-colors ${hover}`}
              >
                {l.label}
              </Link>,
            )}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1">
        {SOCIAL_LINKS.map((s) => {
          const className = `inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${muted} ${hover} ${
            light
              ? "border-black/10 bg-black/[0.04] hover:border-black/20"
              : "border-white/10 bg-white/5 hover:border-[oklch(0.72_0.19_245_/_0.5)]"
          }`;
          return (
            <span key={s.label}>
              {wrap(
                s.href.startsWith("/") ? (
                  <Link
                    to={s.href}
                    onClick={onNavigate}
                    aria-label={s.label}
                    className={className}
                  >
                    {s.icon}
                  </Link>
                ) : (
                  <a
                    href={s.href}
                    {...externalAnchorProps(s.href)}
                    onClick={onNavigate}
                    aria-label={s.label}
                    className={className}
                  >
                    {s.icon}
                  </a>
                ),
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- the bar ---------- */

/**
 * The header for every page that is not the bridge app itself - those use
 * {@link BridgeHeader}, whose job is the app's own chrome. Keeping one component
 * means the Product and Resources menus cannot drift apart between pages.
 */
export function SiteHeader({
  scrollRef,
  theme = "dark",
  stats,
}: {
  /** The element that scrolls, on pages that scroll inside a container. */
  scrollRef?: RefObject<HTMLElement | null>;
  /** `light` tints the bar for a page whose light sections pass under it. */
  theme?: HeaderTheme;
  /** Live figures - shown beside the CTA when there is room, on their own row when not. */
  stats?: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  // An open dropdown is a child of the bar, so it would ride away with it when
  // headroom hides the bar on scroll. Empty string is Radix's closed state.
  const [openGroup, setOpenGroup] = useState("");
  const hidden = useHeadroom({
    scrollRef,
    pinned: menuOpen || openGroup !== "",
  });
  const light = theme === "light";
  const close = () => setMenuOpen(false);

  return (
    // `sticky` rather than `fixed`: a page that scrolls inside a container would
    // otherwise stretch the bar across the container's scrollbar too.
    // Transform is spelled out alongside the colours because two `transition-*`
    // utilities on one element would each claim `transition-property`.
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-xl transition-[transform,background-color,border-color] duration-300 ease-out will-change-transform ${
        hidden ? "-translate-y-full" : "translate-y-0"
      } ${light ? "border-black/10 bg-white/70" : "border-white/5 bg-background/70"}`}
    >
      <div className="relative flex h-16 w-full items-center justify-between gap-4 px-4 md:px-8">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2"
          aria-label="Skyline home"
        >
          <img
            src={logoAsset}
            alt="Skyline"
            className={`h-8 w-auto max-w-none shrink-0 transition-[filter] duration-300 md:h-9 ${
              light ? "brightness-[0.35] saturate-[3]" : ""
            }`}
          />
        </Link>

        <NavigationMenu.Root
          delayDuration={100}
          value={openGroup}
          onValueChange={setOpenGroup}
          aria-label="Main"
          className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 min-[900px]:block"
        >
          <NavigationMenu.List className="pointer-events-auto flex items-center gap-1">
            {NAV_GROUPS.map((group) => (
              <NavigationMenu.Item key={group.label} className="relative">
                <NavigationMenu.Trigger
                  className={`group inline-flex select-none items-center gap-1.5 rounded-full px-3 py-2 text-[15px] font-medium outline-none transition-colors ${
                    light
                      ? "text-neutral-700 hover:text-[oklch(0.5_0.19_262)] data-[state=open]:text-[oklch(0.5_0.19_262)]"
                      : "text-foreground/90 hover:text-[oklch(0.85_0.15_235)] data-[state=open]:text-[oklch(0.85_0.15_235)]"
                  }`}
                >
                  {group.label}
                  <ChevronDown
                    aria-hidden
                    className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
                  />
                </NavigationMenu.Trigger>
                {/* The padding, not a margin, carries the gap below the
                    trigger: the pointer has to stay inside the content to
                    cross it, or the menu closes on the way down. */}
                <NavigationMenu.Content
                  className={`absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-1 ${
                    group.columns === 2 ? "w-[34rem]" : "w-80"
                  }`}
                >
                  <div
                    // Opaque, like the app's other menus: the header's own
                    // backdrop-filter re-roots any blur set here, so a
                    // translucent panel would just let the page read through it.
                    className={`rounded-xl border p-1.5 shadow-[0_24px_60px_-24px_oklch(0.08_0.02_260_/_0.85)] ${
                      light
                        ? "border-black/10 bg-white"
                        : "border-white/10 bg-popover"
                    }`}
                  >
                    <ul
                      // The grid fills row by row, so reading order, DOM order
                      // and tab order stay the same across the two columns.
                      className={
                        group.columns === 2 ? "grid grid-cols-2 gap-x-2" : ""
                      }
                    >
                      {group.entries.map((entry) => (
                        <li key={entry.label}>
                          <MenuEntry entry={entry} light={light} inMenu />
                        </li>
                      ))}
                    </ul>
                    {group.footer && <MenuFooter light={light} inMenu />}
                  </div>
                </NavigationMenu.Content>
              </NavigationMenu.Item>
            ))}
          </NavigationMenu.List>
        </NavigationMenu.Root>

        <div className="flex shrink-0 items-center gap-2">
          {stats ? (
            <div className="hidden items-center gap-2 min-[1120px]:flex">
              {stats}
            </div>
          ) : null}
          <Link
            to="/bridge-app"
            className="btn-primary-glow hidden items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold min-[900px]:inline-flex"
          >
            Open Bridge <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </Link>
          <button
            type="button"
            className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${
              light ? "text-neutral-900" : "text-foreground"
            } min-[900px]:hidden`}
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {stats ? (
        <div className="flex w-full items-center justify-center gap-3 px-4 pb-3 min-[1120px]:hidden">
          {stats}
        </div>
      ) : null}

      {menuOpen && (
        <div
          className={`scrollbar-sky max-h-[calc(100svh-4rem)] overflow-y-auto border-t min-[900px]:hidden ${
            light
              ? "border-black/10 bg-white/95"
              : "border-white/5 bg-background/95"
          }`}
        >
          <div className="container-page flex flex-col gap-4 py-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <div
                  className={`mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    light ? "text-neutral-500" : "text-muted-foreground/70"
                  }`}
                >
                  {group.label}
                </div>
                <ul>
                  {group.entries.map((entry) => (
                    <li key={entry.label}>
                      <MenuEntry
                        entry={entry}
                        light={light}
                        onNavigate={close}
                      />
                    </li>
                  ))}
                </ul>
                {group.footer && (
                  <MenuFooter light={light} onNavigate={close} />
                )}
              </div>
            ))}
            <Link
              to="/bridge-app"
              onClick={close}
              className="btn-primary-glow inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"
            >
              Open Bridge <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
