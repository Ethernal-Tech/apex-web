import { isAddress } from "web3-validator";
import { isValidSolanaOnCurveAddress } from "@/lib/wallet/solanaAddress";
import { BridgingModeEnum, getBridgingMode } from "@/lib/bridging/mode";
import { isCardanoChain, isEvmChain, isSolanaChain } from "@/lib/chains";
import {
  BridgingSettingsTokenPairDto,
  ChainEnum,
  SettingsResponseDto,
} from "@/swagger/apexBridgeApiService";
import { NewAddress, RewardAddress } from "@/lib/wallet/address/addreses";
import { checkCardanoAddressCompatibility } from "@/lib/wallet/network";
import {
  convertDfmToWei,
  convertWeiToDfm,
  convertEvmDfmToApex,
  convertUtxoDfmToApex,
  convertWeiToDfmByChain,
  convertDfmToApex,
  convertLamportsToWei,
} from "@/lib/amount";
import appSettings from "@/settings/appSettings";
import type { ISettingsState } from "@/lib/api/settings";
import { getCurrencyID } from "@/lib/tokens";
import { getTokenInfo } from "../tokenInfo";

const EVM_ZERO_ADDRESS_REGEX = /^(0x)?0{40}$/i;

// the bridge treats the zero address on EVM destinations as its fee address, so
// the amount sent to it would end up as bridging fee instead of being delivered
const isEvmZeroAddress = (address: string) =>
  EVM_ZERO_ADDRESS_REGEX.test(address.trim());

const ZERO_ADDRESS_DESTINATION_ERROR =
  "Zero address can not be used as destination address";
const INVALID_ADDRESS_ERROR = "Invalid destination address";
const INCOMPATIBLE_ADDRESS_ERROR =
  "Destination address is not compatible with the destination network";

/** Validates the amount and destination address; returns the first error. */
export const validateSubmitTxInputs = (
  settings: ISettingsState,
  srcChain: ChainEnum,
  dstChain: ChainEnum,
  dstAddr: string,
  amount: string,
  tokenID: number,
): string | undefined =>
  validateBridgeAmount(settings, srcChain, dstChain, BigInt(amount), tokenID) ??
  validateDestinationAddress(settings, srcChain, dstChain, dstAddr, tokenID);

/** Direction/token support and min/max amount checks. */
export function validateBridgeAmount(
  settings: ISettingsState,
  srcChain: ChainEnum,
  dstChain: ChainEnum,
  amount: bigint,
  tokenID: number,
): string | undefined {
  const subSettings = getBridgingMode(settings, srcChain, dstChain, tokenID);
  switch (subSettings.bridgingMode) {
    case BridgingModeEnum.LayerZero:
      return amount === BigInt(0) ? "Amount cant be zero" : undefined;
    case BridgingModeEnum.Skyline:
      return skylineAmountValidation(
        srcChain,
        dstChain,
        amount,
        tokenID,
        subSettings.settings!,
      );
    case BridgingModeEnum.Reactor:
      return reactorAmountValidation(srcChain, amount, subSettings.settings!);
    default:
      return `unknown direction ${srcChain} -> ${dstChain}`;
  }
}

export function validateDestinationAddress(
  settings: ISettingsState,
  srcChain: ChainEnum,
  dstChain: ChainEnum,
  dstAddr: string,
  tokenID: number,
): string | undefined {
  const { bridgingMode } = getBridgingMode(
    settings,
    srcChain,
    dstChain,
    tokenID,
  );

  // LayerZero destinations are always EVM chains
  if (bridgingMode === BridgingModeEnum.LayerZero || isEvmChain(dstChain)) {
    if (!isAddress(dstAddr)) {
      return INVALID_ADDRESS_ERROR;
    }
    if (isEvmZeroAddress(dstAddr)) {
      return ZERO_ADDRESS_DESTINATION_ERROR;
    }
  } else if (isCardanoChain(dstChain)) {
    const addr = NewAddress(dstAddr);
    if (!addr || addr instanceof RewardAddress || dstAddr !== addr.String()) {
      return INVALID_ADDRESS_ERROR;
    }

    if (
      !checkCardanoAddressCompatibility(dstChain, addr, appSettings.isMainnet)
    ) {
      return INCOMPATIBLE_ADDRESS_ERROR;
    }
  } else if (isSolanaChain(dstChain)) {
    if (!isValidSolanaOnCurveAddress(dstAddr)) {
      return INVALID_ADDRESS_ERROR;
    }
  }
}

function reactorAmountValidation(
  srcChain: ChainEnum,
  amount: bigint,
  settings: SettingsResponseDto,
): string | undefined {
  if (!settings) {
    return "settings not provided";
  }

  const tokenInfo = getTokenInfo(
    getCurrencyID(settings.bridgingSettings, srcChain),
  );
  if (isCardanoChain(srcChain)) {
    const minAllowedToBridge = BigInt(
      settings.bridgingSettings.minValueToBridge,
    );
    if (amount < minAllowedToBridge) {
      return `Amount too low. The minimum amount is ${convertUtxoDfmToApex(settings.bridgingSettings.minValueToBridge)} ${tokenInfo.label}`;
    }

    const maxAllowedToBridgeDfm = BigInt(
      convertWeiToDfm(settings.bridgingSettings.maxAmountAllowedToBridge),
    );
    if (maxAllowedToBridgeDfm > 0 && amount > maxAllowedToBridgeDfm) {
      return `Amount more than maximum allowed: ${convertUtxoDfmToApex(maxAllowedToBridgeDfm.toString(10))} ${tokenInfo.label}`;
    }
  } else if (isEvmChain(srcChain)) {
    const minAllowedToBridge = BigInt(
      convertDfmToWei(settings.bridgingSettings.minValueToBridge),
    );
    if (amount < minAllowedToBridge) {
      return `Amount too low. The minimum amount is ${convertUtxoDfmToApex(settings.bridgingSettings.minValueToBridge)} ${tokenInfo.label}`;
    }

    const maxAllowedToBridgeWei = BigInt(
      settings.bridgingSettings.maxAmountAllowedToBridge,
    );
    if (maxAllowedToBridgeWei > 0 && amount > maxAllowedToBridgeWei) {
      return `Amount more than maximum allowed: ${convertEvmDfmToApex(maxAllowedToBridgeWei.toString(10))} ${tokenInfo.label}`;
    }
  }
}

function skylineAmountValidation(
  srcChain: ChainEnum,
  dstChain: ChainEnum,
  amount: bigint,
  tokenID: number,
  settings: SettingsResponseDto,
): string | undefined {
  const tokenInfo = getTokenInfo(tokenID);
  const srcCurrencyID = getCurrencyID(settings.bridgingSettings, srcChain);
  const dstCurrencyID = getCurrencyID(settings.bridgingSettings, dstChain);

  const tokenPair = (
    (
      settings.bridgingSettings.directionConfig[srcChain] || {
        destChain: {},
      }
    ).destChain[dstChain] || []
  ).find((x: BridgingSettingsTokenPairDto) => x.srcTokenID === tokenID);
  if (!tokenPair) {
    return `Bridging ${tokenInfo.label} from chain ${srcChain} not allowed`;
  }

  const isCurrencyBridging = tokenID === srcCurrencyID;
  const isWrappedCurrencyBridging =
    !isCurrencyBridging && tokenPair.dstTokenID === dstCurrencyID;

  let minValue = BigInt(0);

  if (isWrappedCurrencyBridging && isCardanoChain(dstChain)) {
    if (isCardanoChain(dstChain)) {
      minValue = BigInt(
        convertDfmToWei(
          settings.bridgingSettings.minUtxoChainValue[dstChain] ||
            settings.bridgingSettings.minValueToBridge,
        ),
      );
    } else if (isSolanaChain(dstChain)) {
      minValue = BigInt(
        convertLamportsToWei(
          settings.bridgingSettings.minUtxoChainValue[dstChain] ||
            settings.bridgingSettings.minValueToBridge,
        ),
      );
    }
  } else if (isCurrencyBridging && isCardanoChain(srcChain)) {
    minValue = BigInt(
      convertDfmToWei(
        settings.bridgingSettings.minUtxoChainValue[srcChain] ||
          settings.bridgingSettings.minValueToBridge,
      ),
    );
  } else {
    const minColCoinsAllowedSrc = BigInt(
      settings.bridgingSettings.minColCoinsAllowedToBridge[srcChain] || "0",
    );
    const minColCoinsAllowedDest = BigInt(
      settings.bridgingSettings.minColCoinsAllowedToBridge[dstChain] || "0",
    );

    const minValueSrc = isEvmChain(srcChain)
      ? minColCoinsAllowedSrc
      : BigInt(convertDfmToWei(minColCoinsAllowedSrc));

    const minValueDst = isEvmChain(dstChain)
      ? minColCoinsAllowedDest
      : BigInt(convertDfmToWei(minColCoinsAllowedDest));

    minValue = minValueSrc > minValueDst ? minValueSrc : minValueDst;
  }

  const maxAllowed = isCurrencyBridging
    ? settings.bridgingSettings.maxAmountAllowedToBridge
    : settings.bridgingSettings.maxTokenAmountAllowedToBridge;

  // if chain is not evm, it means it's cardano or solana, so we need to convert the min value and max allowed to dfm because we use wei for validation
  // if (!isEvmChain(srcChain)) {
  // 	const minValueBN = BigInt(convertWeiToDfmByChain(minValue || '0', srcChain));
  // 	if (amount < minValueBN) {
  // 		return `Amount too low. The minimum amount is ${convertDfmToApex(minValueBN.toString(10), srcChain)} ${tokenInfo.label}`;
  // 	}

  // 	const maxAllowedToBridgeDfm = BigInt(
  // 		convertWeiToDfmByChain(maxAllowed || '0', srcChain),
  // 	);
  // 	if (maxAllowedToBridgeDfm > 0 && amount > maxAllowedToBridgeDfm) {
  // 		return `Amount more than maximum allowed: ${convertDfmToApex(maxAllowedToBridgeDfm.toString(10), srcChain)} ${tokenInfo.label}`;
  // 	}
  // } else {
  // 	const minValueWei = BigInt(minValue || '0');
  // 	if (amount < minValueWei) {
  // 		return `Amount too low. The minimum amount is ${convertEvmDfmToApex(minValueWei.toString(10))} ${tokenInfo.label}`;
  // 	}

  // 	const maxAllowedWei = BigInt(maxAllowed || '0');
  // 	if (maxAllowedWei > 0 && amount > maxAllowedWei) {
  // 		return `Amount more than maximum allowed: ${convertEvmDfmToApex(maxAllowedWei.toString(10))} ${tokenInfo.label}`;
  // 	}
  // }

  // returns wei for evm chains
  const minValueWei = BigInt(convertWeiToDfmByChain(minValue || "0", srcChain));
  if (amount < minValueWei) {
    return `Amount too low. The minimum amount is ${convertDfmToApex(minValueWei.toString(10), srcChain)} ${tokenInfo.label}`;
  }

  const maxAllowedToBridgeDfm = BigInt(
    convertWeiToDfmByChain(maxAllowed || "0", srcChain), // returns wei for evm chains
  );
  if (maxAllowedToBridgeDfm > 0 && amount > maxAllowedToBridgeDfm) {
    return `Amount more than maximum allowed: ${convertDfmToApex(maxAllowedToBridgeDfm.toString(10), srcChain)} ${tokenInfo.label}`;
  }
}
