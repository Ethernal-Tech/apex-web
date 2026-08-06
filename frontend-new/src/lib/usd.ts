/** Shared USD formatting for the TVL / TVB stat chips. */

/** `$12.45M` — for tight spots (mobile header, compact chips). */
export function formatUsdCompact(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "—";

  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

/** `$12,450,238.71` — for the wide header. */
export function formatUsdFull(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "—";

  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
