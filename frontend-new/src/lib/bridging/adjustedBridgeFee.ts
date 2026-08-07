import { convertApexToDfm } from "@/lib/amount";
import {
  calculateTokenUtxoMinValue,
  createUtxo,
} from "@/lib/cardano/utxoMinValue";
import { isCardanoChain, isEvmChain, isSolanaChain } from "@/lib/chains";
import { getTokenConfig } from "@/lib/tokens";
import type { SettingsResponse } from "@/lib/api/settings";

export function getDefaultBridgeTxFee(params: {
  chain: string;
  sourceTokenID: number | undefined;
  currencyID: number | undefined;
  minChainFeeForBridging: { [key: string]: string } | undefined;
  minChainFeeForBridgingTokens: { [key: string]: number } | undefined;
}): string {
  const {
    chain,
    sourceTokenID,
    currencyID,
    minChainFeeForBridging,
    minChainFeeForBridgingTokens,
  } = params;

  if (
    isEvmChain(chain) ||
    isSolanaChain(chain) ||
    !sourceTokenID ||
    currencyID === undefined ||
    sourceTokenID === currencyID
  ) {
    return minChainFeeForBridging?.[chain] || "0";
  }

  return (minChainFeeForBridgingTokens?.[chain] || BigInt(0)).toString();
}

/**
 * When bridging Cardano native tokens, add the min ADA required to carry
 * those tokens to the bridge address — but only while the displayed fee is
 * still the predefined minimum (live create-fee has not replaced it yet).
 */
export async function getAdjustedBridgeTxFee(params: {
  settings: SettingsResponse | undefined;
  bridgingAddresses: string[];
  chain: string;
  sourceTokenID: number | undefined;
  currencyID: number | undefined;
  amountDisplay: string;
  bridgeTxFeeDfm: string;
  defaultBridgeTxFeeDfm: string;
  minUtxoValue: number;
}): Promise<string> {
  const {
    settings,
    bridgingAddresses,
    chain,
    sourceTokenID,
    currencyID,
    amountDisplay,
    bridgeTxFeeDfm,
    defaultBridgeTxFeeDfm,
    minUtxoValue,
  } = params;

  if (
    bridgingAddresses.length === 0 ||
    !isCardanoChain(chain) ||
    !sourceTokenID ||
    currencyID === undefined ||
    sourceTokenID === currencyID ||
    bridgeTxFeeDfm === "0" ||
    bridgeTxFeeDfm !== defaultBridgeTxFeeDfm
  ) {
    return bridgeTxFeeDfm;
  }

  const tokenConfig = getTokenConfig(settings, chain, sourceTokenID);
  if (!tokenConfig) {
    return bridgeTxFeeDfm;
  }

  const approxAdditionToBridgingFee = await calculateTokenUtxoMinValue(
    createUtxo(bridgingAddresses[0], "0", {
      [tokenConfig.chainSpecific]: convertApexToDfm(
        amountDisplay || "1",
        chain,
      ),
    }),
    minUtxoValue,
  );

  return (
    BigInt(bridgeTxFeeDfm) + BigInt(approxAdditionToBridgingFee)
  ).toString(10);
}
