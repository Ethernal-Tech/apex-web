import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle,
  AlertCircle,
  Menu,
  X,
} from "lucide-react";
import { FooterSocials } from "@/components/ui/footer-socials";
import {
  ETHERNAL_GITHUB_URL,
  externalAnchorProps,
  SKYLINE_DOCUMENTATION_URL,
} from "@/lib/utils";
import { submitContactForm } from "@/lib/api/contact";
import { pageHead } from "@/lib/seo";
import logoAsset from "@/assets/skyline-logo-transparent.png";

export const Route = createFileRoute("/contact")({
  head: () =>
    pageHead({
      title: "Get in Touch — Skyline",
      description:
        "Have a question about Skyline, our cross-chain bridge, or a partnership? Send us a message and we’ll get back to you as soon as possible.",
      path: "/contact",
    }),
  component: ContactPage,
});

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/bridge-app", label: "Bridge" },
  { to: "/audit", label: "Audit" },
] as const;

function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/70 backdrop-blur-xl">
      <div className="relative flex h-16 w-full items-center justify-between gap-4 px-4 md:px-8">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2"
          aria-label="Skyline home"
        >
          <img
            src={logoAsset}
            alt="Skyline"
            className="h-8 w-auto max-w-none shrink-0 md:h-9"
          />
        </Link>
        <nav className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-8 min-[880px]:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="pointer-events-auto text-[15px] font-medium text-foreground/90 transition-colors hover:text-[oklch(0.85_0.15_235)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center justify-end gap-3 min-[880px]:flex">
          <Link
            to="/bridge-app"
            className="btn-primary-glow inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"
          >
            Open Bridge <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground min-[880px]:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/5 bg-background/95 min-[880px]:hidden">
          <div className="container-page flex flex-col gap-1 py-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/bridge-app"
              onClick={() => setOpen(false)}
              className="btn-primary-glow mt-2 inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"
            >
              Open Bridge <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </header>
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

function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "Name is required";
  if (!form.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Please enter a valid email";
  }
  if (!form.message.trim()) errors.message = "Message is required";

  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, phone: true, message: true });
    if (!isValid) return;

    setStatus("submitting");
    try {
      const phone = form.phone.trim();
      await submitContactForm({
        name: form.name.trim(),
        email: form.email.trim(),
        ...(phone ? { phone } : {}),
        message: form.message.trim(),
      });
      setStatus("success");
      setForm({ name: "", email: "", phone: "", message: "" });
      setTouched({});
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] items-center border-b border-white/5">
      <div className="bg-hero-glow absolute inset-0 opacity-50" />
      <div className="container-page relative w-full py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2 md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Get in touch
            </div>
            <h1 className="text-balance font-display text-4xl font-semibold md:text-5xl">
              <span className="text-gradient-sky">
                Let’s talk about your project
              </span>
            </h1>
            <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-muted-foreground">
              Please share your info with us and we will aim to get back to as
              soon as possible.
            </p>
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[oklch(0.85_0.15_235)]">
                  <Mail className="h-4 w-4" />
                </div>
                <a
                  href="mailto:contact@skylinebridge.tech"
                  className="transition-colors hover:text-foreground"
                >
                  contact@skylinebridge.tech
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[oklch(0.85_0.15_235)]">
                  <MapPin className="h-4 w-4" />
                </div>
                <span>Remote first, with roots in Novi Sad</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[oklch(0.85_0.15_235)]">
                  <Clock className="h-4 w-4" />
                </div>
                <span>Response time: next business day</span>
              </div>
            </div>
          </div>

          <div className="card-glow rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur md:p-8">
            {status === "success" ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[oklch(0.55_0.22_250/0.15)] text-[oklch(0.85_0.15_235)]">
                  <CheckCircle className="h-7 w-7" />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold text-foreground">
                  Message sent
                </h3>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                  We will aim to get back to you in the next 24 hours. Thank you
                  for your patience!
                </p>
                <button
                  type="button"
                  onClick={() => setStatus("idle")}
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-white/[0.06]"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {status === "error" && (
                  <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-foreground">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      There was an error trying to send your message. Please try
                      again later.
                    </div>
                  </div>
                )}
                <div>
                  <label
                    htmlFor="name"
                    className="mb-1.5 block text-xs font-medium text-muted-foreground"
                  >
                    Your Name{" "}
                    <span className="text-[oklch(0.85_0.15_235)]">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                    className={`w-full rounded-xl border bg-white/[0.04] px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-[oklch(0.72_0.19_245_/_0.55)] focus:bg-white/[0.06] ${
                      touched.name && errors.name
                        ? "border-destructive"
                        : "border-white/10"
                    }`}
                    placeholder="John Doe"
                  />
                  {touched.name && errors.name && (
                    <p className="mt-1.5 text-xs text-destructive">
                      {errors.name}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-xs font-medium text-muted-foreground"
                  >
                    Email <span className="text-[oklch(0.85_0.15_235)]">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                    className={`w-full rounded-xl border bg-white/[0.04] px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-[oklch(0.72_0.19_245_/_0.55)] focus:bg-white/[0.06] ${
                      touched.email && errors.email
                        ? "border-destructive"
                        : "border-white/10"
                    }`}
                    placeholder="john@example.com"
                  />
                  {touched.email && errors.email && (
                    <p className="mt-1.5 text-xs text-destructive">
                      {errors.email}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-1.5 block text-xs font-medium text-muted-foreground"
                  >
                    Phone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-[oklch(0.72_0.19_245_/_0.55)] focus:bg-white/[0.06]"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div>
                  <label
                    htmlFor="message"
                    className="mb-1.5 block text-xs font-medium text-muted-foreground"
                  >
                    Message{" "}
                    <span className="text-[oklch(0.85_0.15_235)]">*</span>
                  </label>
                  <textarea
                    id="message"
                    rows={5}
                    value={form.message}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, message: e.target.value }))
                    }
                    onBlur={() => setTouched((t) => ({ ...t, message: true }))}
                    className={`w-full resize-none rounded-xl border bg-white/[0.04] px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-[oklch(0.72_0.19_245_/_0.55)] focus:bg-white/[0.06] ${
                      touched.message && errors.message
                        ? "border-destructive"
                        : "border-white/10"
                    }`}
                    placeholder="Tell us what you need..."
                  />
                  {touched.message && errors.message && (
                    <p className="mt-1.5 text-xs text-destructive">
                      {errors.message}
                    </p>
                  )}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  By sending this message, you agree to our{" "}
                  <Link
                    to="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[oklch(0.85_0.15_235)] hover:underline"
                  >
                    Privacy
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/terms-of-service"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[oklch(0.85_0.15_235)] hover:underline"
                  >
                    Terms
                  </Link>
                  .
                </p>
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="btn-primary-glow w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {status === "submitting" ? (
                    "Sending..."
                  ) : (
                    <>
                      Send the message <Send className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <ContactForm />
      </main>
      <Footer />
    </div>
  );
}
