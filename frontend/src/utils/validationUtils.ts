import { isAddress } from "web3-validator";
import { BridgingType, getBridgingType, isCardanoChain, isEvmChain } from "../settings/chain";
import { ChainEnum } from "../swagger/apexBridgeApiService";
import { getTokenInfoBySrcDst } from "../settings/token";
import { NewAddress, RewardAddress } from "../features/Address/addreses";
import { checkCardanoAddressCompatibility } from "./chainUtils";
import { convertDfmToWei, fromWei } from "./generalUtils";
import { ISettingsState } from "../settings/settingsRedux";

export const validateSubmitTxInputs = (
    srcChain: ChainEnum, dstChain: ChainEnum, dstAddr: string, amount: string,
    isNativeToken?: boolean, settings?: ISettingsState,
): string | undefined => {
    switch (getBridgingType(srcChain, dstChain)) {
    case BridgingType.LayerZero:
        return layerZeroValidation(BigInt(amount), dstAddr);
    case BridgingType.Skyline:
        return skylineValidaton(srcChain, dstChain, dstAddr, BigInt(amount), isNativeToken, settings);
    default:
        return reactorValidation(srcChain, dstChain, dstAddr, BigInt(amount), settings);
    }    
}

function layerZeroValidation(amount: bigint, dstAddr: string): string | undefined {
    if (amount === BigInt(0)) {
        return 'Amount cant be zero'
    }
    if (!isAddress(dstAddr)) {
        return `Invalid destination address: ${dstAddr}`;
    }
}

function reactorValidation(
    srcChain: ChainEnum, dstChain: ChainEnum, dstAddr: string,
    amount: bigint, settings?: ISettingsState,
) {
    if (!settings) {
        return "settings not provided";
    }

    const tokenInfo = getTokenInfoBySrcDst(srcChain, dstChain, false);
    if (isCardanoChain(srcChain)) {
        const minAllowedToBridge = BigInt(settings.minValueToBridge);
        if (amount < minAllowedToBridge) {
            return `Amount too low. The minimum amount is ${convertUtxoDfmToApex(settings.minValueToBridge)} ${tokenInfo.label}`;
        }

        const maxAllowedToBridgeDfm = BigInt(settings.maxAmountAllowedToBridge)
        if (maxAllowedToBridgeDfm > 0 && amount > maxAllowedToBridgeDfm) {
            return `Amount more than maximum allowed: ${convertUtxoDfmToApex(maxAllowedToBridgeDfm.toString(10))} ${tokenInfo.label}`;
        }
    } else if (isEvmChain(srcChain)) {
        const minAllowedToBridge = BigInt(convertDfmToWei(settings.minValueToBridge));
        if (amount < minAllowedToBridge) {
            return `Amount too low. The minimum amount is ${convertUtxoDfmToApex(settings.minValueToBridge)} ${tokenInfo.label}`;
        }

        const maxAllowedToBridgeWei = BigInt(convertDfmToWei(settings.maxAmountAllowedToBridge));
        if (maxAllowedToBridgeWei > 0 && amount > maxAllowedToBridgeWei) {
            return `Amount more than maximum allowed: ${convertEvmDfmToApex(maxAllowedToBridgeWei.toString(10))} ${tokenInfo.label}`;
        }
    }

    if (isCardanoChain(dstChain)) {
        const addr = NewAddress(dstAddr);
        if (!addr || addr instanceof RewardAddress || dstAddr !== addr.String()) {
            return `Invalid destination address: ${dstAddr}`;
        }

        if (!checkCardanoAddressCompatibility(dstChain, addr)) {
            return `Destination address not compatible with destination chain: ${dstChain}`;
        }
    } else if (isEvmChain(dstChain)) {
        if (!isAddress(dstAddr)) {
            return `Invalid destination address: ${dstAddr}`;
        }
    }
}

function skylineValidaton(
    srcChain: ChainEnum, dstChain: ChainEnum, dstAddr: string, amount: bigint,
    isNativeToken?: boolean, settings?: ISettingsState,
): string | undefined {
    if (!isNativeToken || !settings) {
        return "settings or isNativeToken not provided";
    }

    const tokenInfo = getTokenInfoBySrcDst(srcChain, dstChain, isNativeToken);
    const chain = isNativeToken ? dstChain : srcChain;
    const minUtxo = BigInt(settings.minUtxoChainValue[chain]);

    if (amount < minUtxo) {
        return `Amount too low. The minimum amount is ${convertUtxoDfmToApex(minUtxo.toString(10))} ${tokenInfo.label}`;
    }

    if (!isNativeToken) {
        const maxAllowedToBridgeDfm = BigInt(settings.maxAmountAllowedToBridge)
        if (maxAllowedToBridgeDfm > 0 && amount > maxAllowedToBridgeDfm) {
            return `Amount more than maximum allowed: ${convertUtxoDfmToApex(maxAllowedToBridgeDfm.toString(10))} ${tokenInfo.label}`;
        }
    } else {
        const maxTokenAllowedToBridgeDfm = BigInt(settings.maxTokenAmountAllowedToBridge)
        if (maxTokenAllowedToBridgeDfm > 0 && amount > maxTokenAllowedToBridgeDfm) {
            return `Token amount more than maximum allowed: ${convertUtxoDfmToApex(maxTokenAllowedToBridgeDfm.toString(10))} ${tokenInfo.label}`;
        }
    }

    const addr = NewAddress(dstAddr);
    if (!addr || addr instanceof RewardAddress || dstAddr !== addr.String()) {
        return `Invalid destination address: ${dstAddr}`;
    }

    if (!checkCardanoAddressCompatibility(dstChain, addr)) {
        return `Destination address not compatible with destination chain: ${dstAddr}`;
    }
}

// converts dfm to apex (prime and vector)
const convertUtxoDfmToApex = (dfm: string | number): string => {
    return fromWei(dfm, 'lovelace');
}

// convert wei to dfm (nexus)
const convertEvmDfmToApex = (dfm: string | number): string => {
    return fromWei(dfm, 'ether');
}
