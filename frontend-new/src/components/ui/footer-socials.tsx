import { Mail, Linkedin } from "lucide-react";

const ICON_CLASS =
  "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-muted-foreground transition-colors hover:border-[oklch(0.72_0.19_245_/_0.5)] hover:text-foreground";

function XLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** Shared with the header's Resources menu, so the two cannot drift apart. */
export const SOCIAL_LINKS = [
  {
    label: "Contact Skyline",
    href: "/contact",
    icon: <Mail className="h-4 w-4" />,
  },
  {
    label: "Skyline on LinkedIn",
    href: "https://www.linkedin.com/company/skylinebridge",
    icon: <Linkedin className="h-4 w-4" />,
  },
  {
    label: "Skyline on X",
    href: "https://x.com/skyline_bridge",
    icon: <XLogo className="h-4 w-4" />,
  },
];

export function FooterSocials({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      {SOCIAL_LINKS.map((s) => (
        <a
          key={s.label}
          href={s.href}
          target={s.href.startsWith("mailto") ? undefined : "_blank"}
          rel={s.href.startsWith("mailto") ? undefined : "noopener noreferrer"}
          aria-label={s.label}
          className={ICON_CLASS}
        >
          {s.icon}
        </a>
      ))}
    </div>
  );
}

export function FooterLegal({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-x-4 gap-y-1 ${className ?? ""}`}>
      <a
        href="/privacy-policy"
        className="transition-colors hover:text-foreground"
      >
        Privacy
      </a>
      <a
        href="/terms-of-service"
        className="transition-colors hover:text-foreground"
      >
        Terms
      </a>
    </div>
  );
}
