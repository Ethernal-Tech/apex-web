/* eslint-disable @typescript-eslint/no-explicit-any */
import { isCardanoChain, isEvmChain, isSolanaChain } from "@/lib/chains";
import Web3 from "web3";

function fromWei(
  number: string | number | bigint,
  unit: string | number,
): string {
  const val = Web3.utils.fromWei(number as any, unit as any);
  return val.endsWith(".") ? val.slice(0, -1) : val;
}

/** Raw smallest-unit amount → human-readable display value. */
export function convertDfmToDisplay(
  dfm: string | number | undefined,
  chain: string,
): string {
  if (dfm === undefined || dfm === "") return "0";
  const raw = typeof dfm === "number" ? BigInt(dfm).toString(10) : dfm;

  if (isEvmChain(chain)) return fromWei(raw, "ether");
  if (isCardanoChain(chain)) return fromWei(raw, "lovelace");
  if (isSolanaChain(chain)) return fromWei(raw, 9);
  return raw;
}

export function toFixedAmount(n: number | string, decimals: number): string {
  return (+n).toFixed(decimals);
}

export function formatBalanceParts(amount: string): {
  whole: string;
  fraction: string | null;
} {
  const [whole, fraction] = amount.split(".");
  return {
    whole: whole.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
    fraction: fraction ?? null,
  };
}
