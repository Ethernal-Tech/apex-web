/* eslint-disable @typescript-eslint/no-explicit-any */
import { isCardanoChain, isEvmChain, isSolanaChain } from "@/lib/chains";
import type { ChainEnum } from "@/swagger/apexBridgeApiService";
import Web3 from "web3";
import type { Numbers } from "web3-types";

function fromWei(
  number: string | number | bigint,
  unit: string | number,
): string {
  const val = Web3.utils.fromWei(number as any, unit as any);
  return val.endsWith(".") ? val.slice(0, -1) : val;
}

function toWei(
  number: string | number | bigint,
  unit: string | number,
): string {
  return Web3.utils.toWei(number as any, unit as any);
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

export const convertUtxoDfmToApex = (dfm: string | number): string =>
  fromWei(dfm, "lovelace");

const convertApexToUtxoDfm = (apex: string | number): string =>
  toWei(apex, "lovelace");

export const convertEvmDfmToApex = (dfm: string | number): string =>
  fromWei(dfm, "ether");

const convertApexToEvmDfm = (apex: string | number): string =>
  toWei(apex, "ether");

export const convertSolanaDfmToApex = (dfm: string | number): string =>
  fromWei(dfm, 9);

export const convertApexToSolanaDfm = (apex: string | number): string =>
  toWei(apex, 9);

export const convertWeiToDfm = (wei: Numbers): string => fromWei(wei, 12);

export const convertDfmToWei = (dfm: Numbers): string => toWei(dfm, 12);

export const convertWeiToLamports = (wei: bigint | Numbers): string =>
  fromWei(wei, 9);

export const convertLamportsToWei = (lamports: bigint | Numbers): string =>
  toWei(lamports, 9);

export const convertLamportsToDfm = (lamports: bigint | Numbers): string =>
  fromWei(lamports, 3);

export const convertWeiToDfmByChain = (
  wei: Numbers,
  chain: ChainEnum | string,
) => {
  if (isCardanoChain(chain)) return convertWeiToDfm(wei);
  if (isSolanaChain(chain)) return convertWeiToLamports(wei);
  return wei;
};

export const convertDfmToApex = (
  dfm: string | number,
  network: ChainEnum | string,
) => {
  if (typeof dfm === "number") dfm = BigInt(dfm).toString(10);

  if (isEvmChain(network)) return convertEvmDfmToApex(dfm);
  if (isCardanoChain(network)) return convertUtxoDfmToApex(dfm);
  if (isSolanaChain(network)) return convertSolanaDfmToApex(dfm);
  return dfm;
};

export const convertApexToDfm = (
  apex: string | number,
  network: ChainEnum | string,
) => {
  if (typeof apex === "number") apex = apex.toString();

  if (isEvmChain(network)) return convertApexToEvmDfm(apex);
  if (isCardanoChain(network)) return convertApexToUtxoDfm(apex);
  if (isSolanaChain(network)) return convertApexToSolanaDfm(apex);
  return apex;
};

export const convertApexToWei = (apex: string | number): string => {
  if (typeof apex === "number") apex = apex.toString();
  return toWei(apex, "ether");
};

export function toFixedAmount(n: number | string, decimals: number): string {
  return (+n).toFixed(decimals);
}

export function toFixedFloor(n: number | string, decimals: number): string {
  const exp = Math.pow(10, decimals);
  return (Math.floor(+n * exp) / exp).toFixed(decimals);
}

export function minBigInt(...args: bigint[]): bigint {
  return args.reduce((min, val) => (val < min ? val : min));
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
