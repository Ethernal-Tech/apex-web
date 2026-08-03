import { useEffect, useLayoutEffect, useRef, useState } from "react";
import horizonAsset from "@/assets/logo-horizon.png.asset.json";
import textAsset from "@/assets/logo-text.png.asset.json";
import logoAsset from "@/assets/skyline-logo-transparent.png.asset.json";
// To change the intro sound: replace the file at src/assets/intro-sound.mp3
// (via lovable-assets) or swap this import for another .mp3.asset.json pointer.
import introSoundAsset from "@/assets/intro-sound.mp3.asset.json";

// Tweak playback here.
const SOUND = {
  src: introSoundAsset.url,
  volume: 0.6, // 0.0 – 1.0
};

// Phases:
//  horizon/text  -> the logo "loads" in. UNSKIPPABLE (~1.45s).
//  wait          -> "press any key to enter" prompt; wait for a user gesture or timeout.
//  fly           -> logo flies into the header slot. Sound plays here, but ONLY if the
//                   user triggered it (a gesture is required for browsers to allow audio).
//  done          -> overlay removed.
type Phase = "horizon" | "text" | "wait" | "fly" | "done";

const D = {
  horizon: 900,
  text: 550,
  fly: 900,
  fade: 350,
  // How long to wait in the "wait" phase for a user gesture before flying on
  // automatically (with no sound, since no gesture happened).
  waitTimeout: 5000,
};

export const INTRO_DONE_EVENT = "skyline-intro-done";

function emitDone() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(INTRO_DONE_EVENT));
  document.documentElement.dataset.introDone = "1";
}

export function IntroAnimation() {
  // Start as "playing" on both SSR and client so the overlay paints on the
  // very first frame — no flash of the page before the intro kicks in.
  // We synchronously clear it in useLayoutEffect if this session already saw it.
  const [active, setActive] = useState(true);
  const [phase, setPhase] = useState<Phase>("horizon");
  const [flyTransform, setFlyTransform] = useState<string | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Guards against firing the "enter" transition more than once (e.g. a rapid
  // double-click or a click + keypress landing in the same tick).
  const proceededRef = useRef(false);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("skyline-intro-played") === "1") {
      setActive(false);
      emitDone();
      return;
    }
    sessionStorage.setItem("skyline-intro-played", "1");
  }, []);

  // Preload the intro sound so it's ready to play the instant the user enters.
  // We do NOT call play() here — browsers block audio without a user gesture,
  // so playback happens in the "wait" phase's interaction handler below.
  useEffect(() => {
    if (!active) return;
    if (typeof window === "undefined") return;
    const audio = new Audio(SOUND.src);
    audio.volume = SOUND.volume;
    audio.preload = "auto";
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    };
  }, [active]);

  // Logo "load" sequence: horizon reveals, then the text appears. This part is
  // unskippable — no interaction listeners are attached until the "wait" phase.
  useEffect(() => {
    if (!active) return;
    const t1 = setTimeout(() => setPhase("text"), D.horizon);
    const t2 = setTimeout(() => setPhase("wait"), D.horizon + D.text);
    return () => [t1, t2].forEach(clearTimeout);
  }, [active]);

  // "wait" phase: show the prompt and wait for a user gesture (which unlocks and
  // plays the sound) or a timeout (which flies on silently).
  useEffect(() => {
    if (phase !== "wait") return;
    const proceed = (withSound: boolean) => {
      if (proceededRef.current) return;
      proceededRef.current = true;
      if (withSound && audioRef.current) {
        // The gesture that got us here satisfies the browser's autoplay policy.
        audioRef.current.play().catch((err) => {
          // Still possible to fail (codec, muted device, etc.) — fly on anyway.
          console.debug("Intro sound failed to play:", err);
        });
      }
      setPhase("fly");
      // Reveal the page in parallel with the fly so the header logo is already
      // fading in beneath the intro logo when it lands.
      emitDone();
    };
    const onInteract = () => proceed(true);
    const t = setTimeout(() => proceed(false), D.waitTimeout);
    window.addEventListener("click", onInteract);
    window.addEventListener("keydown", onInteract);
    return () => {
      clearTimeout(t);
      window.removeEventListener("click", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
  }, [phase]);

  // Once flying, remove the overlay after the fly animation finishes.
  useEffect(() => {
    if (phase !== "fly") return;
    const t = setTimeout(() => {
      setPhase("done");
      setActive(false);
    }, D.fly);
    return () => clearTimeout(t);
  }, [phase]);

  useLayoutEffect(() => {
    if (phase !== "fly" || !groupRef.current) return;
    const target = document.querySelector<HTMLElement>("[data-skyline-logo-target]");
    const src = groupRef.current.getBoundingClientRect();
    if (!target) {
      setFlyTransform("translate(0, 0) scale(1)");
      return;
    }
    const dst = target.getBoundingClientRect();
    const srcCx = src.left + src.width / 2;
    const srcCy = src.top + src.height / 2;
    const dstCx = dst.left + dst.width / 2;
    const dstCy = dst.top + dst.height / 2;
    const scale = dst.height / src.height;
    const dx = dstCx - srcCx;
    const dy = dstCy - srcCy;
    setFlyTransform(`translate(${dx}px, ${dy}px) scale(${scale})`);
  }, [phase]);

  if (!active) return null;

  const showText = phase !== "horizon";
  const flying = phase === "fly";

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        // Fade the backdrop out during the fly so the revealing page shows
        // through, while the logo group itself stays fully visible and lands
        // exactly on top of the header logo.
        backgroundColor: "hsl(var(--background))",
        transition: "opacity 300ms ease-out",
      }}
    >
      {/* Backdrop that fades out during fly, revealing the page beneath */}
      <div
        aria-hidden
        className="absolute inset-0 bg-background"
        style={{
          opacity: flying ? 0 : 1,
          transition: "opacity 700ms ease-out",
        }}
      />
      <img src={logoAsset.url} alt="" className="hidden" />

      <div
        ref={groupRef}
        className="relative flex flex-col items-center gap-2"
        style={{
          transformOrigin: "center center",
          transition: flying
            ? "transform 900ms cubic-bezier(0.65, 0, 0.2, 1)"
            : "transform 500ms cubic-bezier(0.22, 1, 0.36, 1)",
          transform: flying && flyTransform ? flyTransform : "translate(0, 0) scale(1)",
          willChange: "transform, opacity",
        }}
      >
        <img
          src={horizonAsset.url}
          alt=""
          className="w-[min(70vw,720px)] select-none"
          style={{
            animation: "skyline-intro-reveal 900ms cubic-bezier(0.65, 0, 0.35, 1) both",
            filter: "drop-shadow(0 0 24px oklch(0.85 0.18 235 / 0.5))",
          }}
        />
        <img
          src={textAsset.url}
          alt="Skyline"
          className="w-[min(55vw,560px)] select-none"
          style={{
            opacity: showText ? 1 : 0,
            transform: showText ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 550ms ease-out, transform 550ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </div>

      <style>{`
        @keyframes skyline-intro-reveal {
          0% { clip-path: inset(0 100% 0 0); }
          100% { clip-path: inset(0 0 0 0); }
        }
        @keyframes skyline-intro-prompt {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {phase === "wait" && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-16 text-center text-sm text-muted-foreground/80"
          style={{ animation: "skyline-intro-prompt 400ms ease-out both" }}
        >
          Press any key to enter
        </div>
      )}
    </div>
  );
}
