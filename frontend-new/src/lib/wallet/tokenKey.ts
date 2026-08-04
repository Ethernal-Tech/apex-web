import { captureAndThrowError } from "@/lib/wallet/errors";
import Web3 from "web3";
import { isHex } from "web3-validator";

/** Normalize Cardano `policyId.assetName` → unit key used in wallet balance maps. */
export function normalizeNativeTokenKey(k: string): string {
  if (!k.includes(".")) return k;

  const kParts = k.split(".");
  if (kParts.length > 2) {
    captureAndThrowError(
      `invalid native token key: ${k}`,
      "tokenKey.ts",
      "normalizeNativeTokenKey",
    );
  }

  let name = kParts[1];
  if (!isHex(name)) {
    try {
      name = Web3.utils.asciiToHex(name).substring(2);
    } catch {
      /* keep ascii */
    }
  }

  return `${kParts[0]}${name}`;
}
