import { useEffect, useState } from "react";

/**
 * Phones and tablets cannot run the wallet extensions the bridge relies on, so
 * bridging is gated on the device platform rather than on the viewport width —
 * a desktop browser in a narrow window still connects fine.
 */
function detectUnsupportedDevice(): boolean {
  const ua = navigator.userAgent;

  // Chromium reports this directly, but only for phones, so it cannot stand alone.
  const uaData = (
    navigator as Navigator & { userAgentData?: { mobile?: boolean } }
  ).userAgentData;
  if (uaData?.mobile === true) return true;

  if (
    /Android|iPhone|iPod|iPad|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  ) {
    return true;
  }

  // iPadOS 13+ claims to be a Mac; multi-touch is the only reliable giveaway.
  const isMacUa = /Macintosh|Mac OS X/.test(ua);
  if (isMacUa && navigator.maxTouchPoints > 1) return true;

  // "Request desktop site" rewrites the UA but not the primary input. Desktop
  // platforms are exempt so touchscreen laptops and 2-in-1s keep working.
  const touchPrimary = window.matchMedia(
    "(pointer: coarse) and (hover: none)",
  ).matches;
  return touchPrimary && !(/Windows NT/.test(ua) || isMacUa);
}

export function useIsUnsupportedDevice(): boolean {
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    setUnsupported(detectUnsupportedDevice());
  }, []);

  return unsupported;
}
