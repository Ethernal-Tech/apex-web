import {
  NETWORKS,
  setNetwork,
  useNetwork,
  type SkylineNetwork,
} from "@/hooks/use-network";

/** Accent per network - mainnet keeps the Skyline blue, testnet warns in amber. */
const ACCENT: Record<
  SkylineNetwork,
  { dot: string; text: string; pill: string; highlight: string }
> = {
  mainnet: {
    dot: "bg-[oklch(0.85_0.15_235)]",
    text: "text-[oklch(0.9_0.12_235)]",
    pill: "border-[oklch(0.72_0.19_245_/_0.4)] bg-[oklch(0.72_0.19_245_/_0.12)] text-[oklch(0.9_0.12_235)]",
    highlight:
      "translate-x-0 border-[oklch(0.72_0.19_245_/_0.45)] bg-[oklch(0.72_0.19_245_/_0.16)]",
  },
  testnet: {
    dot: "bg-[oklch(0.82_0.16_75)]",
    text: "text-[oklch(0.88_0.13_80)]",
    pill: "border-[oklch(0.78_0.16_75_/_0.4)] bg-[oklch(0.78_0.16_75_/_0.12)] text-[oklch(0.88_0.13_80)]",
    highlight:
      "translate-x-full border-[oklch(0.78_0.16_75_/_0.45)] bg-[oklch(0.78_0.16_75_/_0.16)]",
  },
};

function Dot({
  network,
  active,
}: {
  network: SkylineNetwork;
  active: boolean;
}) {
  return (
    <span className="relative flex h-1.5 w-1.5">
      {active && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${ACCENT[network].dot}`}
        />
      )}
      <span
        className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
          active ? ACCENT[network].dot : "bg-white/25"
        }`}
      />
    </span>
  );
}

/** Segmented mainnet / testnet switch with a sliding accent. */
export function NetworkToggle({ className = "" }: { className?: string }) {
  const network = useNetwork();

  return (
    <span
      role="group"
      aria-label="Network"
      className={`relative inline-grid grid-cols-2 items-center rounded-full border border-white/10 bg-white/[0.04] p-0.5 backdrop-blur ${className}`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute left-0.5 top-0.5 h-[calc(100%-0.25rem)] w-[calc(50%-0.25rem)] rounded-full border transition-transform duration-300 ease-out ${ACCENT[network].highlight}`}
      />
      {NETWORKS.map((n) => {
        const active = n.id === network;
        return (
          <button
            key={n.id}
            type="button"
            aria-pressed={active}
            onClick={() => setNetwork(n.id)}
            className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.72_0.19_245_/_0.6)] ${
              active
                ? ACCENT[n.id].text
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Dot network={n.id} active={active} />
            {n.label}
          </button>
        );
      })}
    </span>
  );
}

/** Read-only pill showing the active network, for headers. */
export function NetworkBadge({ className = "" }: { className?: string }) {
  const network = useNetwork();
  const label = NETWORKS.find((n) => n.id === network)?.label ?? "Mainnet";

  return (
    <span
      className={`items-center gap-2 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${ACCENT[network].pill} ${className}`}
    >
      <Dot network={network} active />
      {label}
    </span>
  );
}
