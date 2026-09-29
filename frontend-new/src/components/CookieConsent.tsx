import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { InitSentry } from "@/lib/sentry";
import { setCookieConsent, shouldShowCookieBanner } from "@/lib/cookies";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(shouldShowCookieBanner());
  }, []);

  const acceptCookies = () => {
    setVisible(false);
    setCookieConsent(true);

    InitSentry();
  };

  const rejectCookies = () => {
    setVisible(false);
    setCookieConsent(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-4">
      <div className="flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-white/10 bg-background/95 p-4 shadow-lg backdrop-blur-xl sm:flex-row sm:items-center">
        <p className="text-sm leading-relaxed text-muted-foreground">
          We use cookies and similar technologies to analyze website traffic,
          improve your browsing experience, and understand where our visitors
          come from. By clicking "Accept", you consent to the use of analytics
          and tracking cookies. You can withdraw your consent at any time in
          your browser settings. For more details, please read our{" "}
          <Link
            to="/privacy-policy"
            className="text-[oklch(0.85_0.15_235)] hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={acceptCookies}
            className="btn-primary-glow inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={rejectCookies}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-sm font-medium transition-colors hover:bg-white/[0.06]"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
