import { useEffect, useRef, useState, type RefObject } from "react";

type HeadroomOptions = {
  /**
   * How far down the page hiding starts. Keeps the header put while the reader
   * is still near the top, where it costs nothing.
   */
  offset?: number;
  /** Jitter smaller than this is ignored, so a trackpad wobble never flips it. */
  tolerance?: number;
  /** The element that scrolls, when it isn't the window. */
  scrollRef?: RefObject<HTMLElement | null>;
  /** Force the header visible - e.g. while a burger menu is open. */
  pinned?: boolean;
};

/**
 * The "headroom" pattern: hide the header on the way down, bring it straight
 * back on the first upward scroll. Content-heavy pages get the whole viewport
 * for reading while the nav stays one flick away.
 */
export function useHeadroom({
  offset = 96,
  tolerance = 8,
  scrollRef,
  pinned = false,
}: HeadroomOptions = {}): boolean {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    if (pinned) {
      setHidden(false);
      return;
    }
    if (typeof window === "undefined") return;

    const container = scrollRef ? scrollRef.current : null;
    if (scrollRef && !container) return;

    const target: HTMLElement | Window = container ?? window;
    const scrollTop = () =>
      container ? container.scrollTop : window.scrollY || 0;

    let frame = 0;
    lastY.current = scrollTop();

    const probe = () => {
      frame = 0;
      const y = scrollTop();
      const delta = y - lastY.current;
      // Overscroll on iOS reports positions past both ends; treating those as
      // real movement would hide the header the moment the bounce settles.
      if (Math.abs(delta) < tolerance) return;
      lastY.current = y;
      setHidden(y > offset && delta > 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(probe);
    };

    target.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      target.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [offset, tolerance, scrollRef, pinned]);

  return pinned ? false : hidden;
}

/** Transform classes for a `sticky`/`fixed` header driven by {@link useHeadroom}. */
export function headroomClass(hidden: boolean): string {
  return `transition-transform duration-300 ease-out will-change-transform ${
    hidden ? "-translate-y-full" : "translate-y-0"
  }`;
}
