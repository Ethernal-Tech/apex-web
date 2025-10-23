import { isAddress } from "web3-validator";
import { BridgingModeEnum, getBridgingMode, isCardanoChain, isEvmChain, isSolanaBridging } from "../settings/chain";
import { ChainEnum } from "../swagger/apexBridgeApiService";
import { getTokenInfoBySrcDst } from "../settings/token";
import { NewAddress, RewardAddress } from "../features/Address/addreses";
import { checkCardanoAddressCompatibility } from "./chainUtils";
import { convertDfmToWei, convertEvmDfmToApex, convertUtxoDfmToApex, shouldUseMainnet } from "./generalUtils";
import { ISettingsState, SettingsPerMode } from "../settings/settingsRedux";

export const validateSubmitTxInputs = (
    srcChain: ChainEnum, dstChain: ChainEnum, dstAddr: string, amount: string,
    isNativeToken: boolean, settings?: ISettingsState,
): string | undefined => {
    const subSettings = getBridgingMode(srcChain, dstChain, settings);

    if (isSolanaBridging(srcChain, dstChain)){
        return solanaValidation(BigInt(amount))
    }

    switch (subSettings.bridgingMode) {
    case BridgingModeEnum.LayerZero:
        return layerZeroValidation(BigInt(amount), dstAddr);
    case BridgingModeEnum.Skyline:
        return skylineValidaton(srcChain, dstChain, dstAddr, BigInt(amount), isNativeToken, subSettings.settings!);
    case BridgingModeEnum.Reactor:
        return reactorValidation(srcChain, dstChain, dstAddr, BigInt(amount), subSettings.settings!);
    default:
        return `unknown direction ${srcChain} -> ${dstChain}`;
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

function solanaValidation(amount: bigint){
    if (amount === BigInt(0)){
        return 'Amount cant be zero'
    }
}

function reactorValidation(
    srcChain: ChainEnum, dstChain: ChainEnum, dstAddr: string,
    amount: bigint, settings: SettingsPerMode,
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

        if (!checkCardanoAddressCompatibility(dstChain, addr, shouldUseMainnet(srcChain, dstChain))) {
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
    isNativeToken: boolean, settings: SettingsPerMode,
): string | undefined {
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

    if (!checkCardanoAddressCompatibility(dstChain, addr, shouldUseMainnet(srcChain, dstChain))) {
        return `Destination address not compatible with destination chain: ${dstChain}`;
    }
}
