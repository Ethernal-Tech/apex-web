import { useEffect, useState, type ReactNode } from "react";
import { INTRO_DONE_EVENT } from "./IntroAnimation";

/**
 * Wraps page content so it reveals with a soft glow-in + fade-up
 * after the intro animation completes (or immediately if already played).
 */
export function PageReveal({ children }: { children: ReactNode }) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Already-played sessions: intro emits done synchronously in a layout effect
    // before this runs, so the flag will be set.
    if (document.documentElement.dataset.introDone === "1") {
      setRevealed(true);
      return;
    }
    const onDone = () => setRevealed(true);
    window.addEventListener(INTRO_DONE_EVENT, onDone);
    return () => window.removeEventListener(INTRO_DONE_EVENT, onDone);
  }, []);

  return (
    <>
      {/* Ambient background wash that blooms in behind everything */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, oklch(0.55 0.22 250 / 0.35), transparent 65%), radial-gradient(ellipse 50% 35% at 50% 8%, oklch(0.85 0.18 235 / 0.28), transparent 70%)",
          opacity: revealed ? 1 : 0,
          transform: revealed ? "scale(1)" : "scale(1.15)",
          transition:
            "opacity 1200ms ease-out, transform 1600ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
      <div
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? "translateY(0)" : "translateY(14px)",
          filter: revealed ? "blur(0px)" : "blur(6px)",
          transition:
            "opacity 900ms ease-out 150ms, transform 1000ms cubic-bezier(0.22, 1, 0.36, 1) 150ms, filter 900ms ease-out 150ms",
        }}
      >
        {children}
      </div>
    </>
  );
}
