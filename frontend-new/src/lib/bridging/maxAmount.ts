import { convertLamportsToDfm, convertWeiToDfm, minBigInt } from "@/lib/amount";
import { BridgingModeEnum } from "@/lib/bridging/mode";
import { isEvmChain, isSolanaChain } from "@/lib/chains";
import appSettings from "@/settings/appSettings";

export type MaxAmounts = {
  maxByBalance: bigint;
  maxByAllowed: bigint;
};

function balanceOf(
  totalBalance: Record<string, string>,
  tokenID: number,
): bigint {
  return BigInt(totalBalance[tokenID] ?? totalBalance[String(tokenID)] ?? "0");
}

function convertMaxAllowedToChainUnits(
  maxAllowed: string,
  chain: string,
): bigint {
  if (BigInt(maxAllowed || "0") === BigInt(0)) return BigInt(0);
  if (isEvmChain(chain)) return BigInt(maxAllowed);
  if (isSolanaChain(chain)) return BigInt(convertLamportsToDfm(maxAllowed));
  return BigInt(convertWeiToDfm(maxAllowed));
}

export function calculateMaxAmountToken(
  totalBalance: Record<string, string>,
  sourceTokenID: number | undefined,
  currencyID: number | undefined,
  maxTokenAmountAllowedToBridge: string,
  chain: string,
): MaxAmounts {
  if (
    !sourceTokenID ||
    currencyID === undefined ||
    sourceTokenID === currencyID ||
    !chain
  ) {
    return { maxByAllowed: BigInt(0), maxByBalance: BigInt(0) };
  }

  const maxTokenAllowed = convertMaxAllowedToChainUnits(
    maxTokenAmountAllowedToBridge,
    chain,
  );
  const tokenBalance = balanceOf(totalBalance, sourceTokenID);
  const tokenBalanceAllowedToUse =
    maxTokenAllowed !== BigInt(0) && tokenBalance > maxTokenAllowed
      ? maxTokenAllowed
      : tokenBalance;

  return {
    maxByAllowed: tokenBalanceAllowedToUse,
    maxByBalance: tokenBalance,
  };
}

export function calculateMaxAmountCurrency(
  totalBalance: Record<string, string>,
  sourceTokenID: number | undefined,
  currencyID: number | undefined,
  maxAmountAllowedToBridge: string,
  chain: string,
  changeMinUtxo: number,
  nonCardanoWalletFee: string,
  bridgeTxFee: string,
  operationFee: string,
): MaxAmounts {
  if (!sourceTokenID || currencyID === undefined || !chain) {
    return { maxByAllowed: BigInt(0), maxByBalance: BigInt(0) };
  }

  const maxAllowed = convertMaxAllowedToChainUnits(
    maxAmountAllowedToBridge,
    chain,
  );
  const currencyBalance = balanceOf(totalBalance, currencyID);
  const balanceAllowedToUse =
    maxAllowed !== BigInt(0) && currencyBalance > maxAllowed
      ? maxAllowed
      : currencyBalance;

  let maxByBalance: bigint;
  if (isEvmChain(chain) || isSolanaChain(chain)) {
    maxByBalance =
      currencyBalance -
      BigInt(bridgeTxFee || "0") -
      BigInt(nonCardanoWalletFee || "0") -
      BigInt(operationFee || "0");
  } else {
    maxByBalance =
      currencyBalance -
      BigInt(appSettings.potentialWalletFee) -
      BigInt(bridgeTxFee || "0") -
      BigInt(changeMinUtxo) -
      BigInt(operationFee || "0");
  }

  return { maxByAllowed: balanceAllowedToUse, maxByBalance };
}

/** LayerZero: currency max = balance − bridge fee − wallet fee. */
export function calculateLzMaxAmountCurrency(
  totalBalance: Record<string, string>,
  sourceTokenID: number | undefined,
  currencyID: number | undefined,
  bridgeTxFee: string,
  userWalletFee: string,
): bigint {
  if (!sourceTokenID || currencyID === undefined) return BigInt(0);
  return (
    balanceOf(totalBalance, currencyID) -
    BigInt(bridgeTxFee || "0") -
    BigInt(userWalletFee || "0")
  );
}

export function calculateLzMaxAmountToken(
  totalBalance: Record<string, string>,
  sourceTokenID: number | undefined,
  currencyID: number | undefined,
): bigint {
  if (
    !sourceTokenID ||
    currencyID === undefined ||
    sourceTokenID === currencyID
  ) {
    return BigInt(0);
  }
  return balanceOf(totalBalance, sourceTokenID);
}

export type ResolveBridgeMaxAmountsParams = {
  bridgingMode: BridgingModeEnum;
  totalBalance: Record<string, string>;
  sourceTokenID: number | undefined;
  currencyID: number | undefined;
  chain: string;
  maxAmountAllowedToBridge: string;
  maxTokenAmountAllowedToBridge: string;
  changeMinUtxo: number;
  userWalletFeeDfm: string;
  bridgeTxFeeDfm: string;
  operationFeeDfm: string;
};

export type ResolvedBridgeMaxAmounts = {
  maxAmounts: MaxAmounts;
  currencyMaxAmount: bigint;
  maxSendable: bigint;
};

export function resolveBridgeMaxAmounts(
  params: ResolveBridgeMaxAmountsParams,
): ResolvedBridgeMaxAmounts {
  const {
    bridgingMode,
    totalBalance,
    sourceTokenID,
    currencyID,
    chain,
    maxAmountAllowedToBridge,
    maxTokenAmountAllowedToBridge,
    changeMinUtxo,
    userWalletFeeDfm,
    bridgeTxFeeDfm,
    operationFeeDfm,
  } = params;

  const isToken =
    sourceTokenID !== undefined &&
    currencyID !== undefined &&
    sourceTokenID !== currencyID;

  if (bridgingMode === BridgingModeEnum.LayerZero) {
    const currencyMax = calculateLzMaxAmountCurrency(
      totalBalance,
      sourceTokenID,
      currencyID,
      bridgeTxFeeDfm,
      userWalletFeeDfm,
    );
    const tokenMax = calculateLzMaxAmountToken(
      totalBalance,
      sourceTokenID,
      currencyID,
    );
    const max = isToken ? tokenMax : currencyMax;
    const maxAmounts = { maxByBalance: max, maxByAllowed: max };
    return {
      maxAmounts,
      currencyMaxAmount: currencyMax,
      maxSendable: max,
    };
  }

  const currencyMaxAmounts = calculateMaxAmountCurrency(
    totalBalance,
    sourceTokenID,
    currencyID,
    maxAmountAllowedToBridge,
    chain,
    changeMinUtxo,
    userWalletFeeDfm,
    bridgeTxFeeDfm,
    operationFeeDfm,
  );
  const tokenMaxAmounts = calculateMaxAmountToken(
    totalBalance,
    sourceTokenID,
    currencyID,
    maxTokenAmountAllowedToBridge,
    chain,
  );
  const maxAmounts = isToken ? tokenMaxAmounts : currencyMaxAmounts;
  const currencyMaxAmount = minBigInt(
    currencyMaxAmounts.maxByAllowed,
    currencyMaxAmounts.maxByBalance,
  );

  return {
    maxAmounts,
    currencyMaxAmount,
    maxSendable: minBigInt(maxAmounts.maxByAllowed, maxAmounts.maxByBalance),
  };
}
