import { isAddress } from 'web3-validator';
import {
	BridgingModeEnum,
	getBridgingMode,
	isCardanoChain,
	isEvmChain,
} from '../settings/chain';
import {
	BridgingSettingsTokenPairDto,
	ChainEnum,
	SettingsResponseDto,
} from '../swagger/apexBridgeApiService';
import { NewAddress, RewardAddress } from '../features/Address/addreses';
import { checkCardanoAddressCompatibility } from './chainUtils';
import {
	convertDfmToWei,
	convertEvmDfmToApex,
	convertUtxoDfmToApex,
	shouldUseMainnet,
} from './generalUtils';
import { ISettingsState } from '../settings/settingsRedux';
import { getCurrencyID, getTokenInfo } from '../settings/token';

export const validateSubmitTxInputs = (
	settings: ISettingsState,
	srcChain: ChainEnum,
	dstChain: ChainEnum,
	dstAddr: string,
	amount: string,
	tokenID: number,
): string | undefined => {
	const subSettings = getBridgingMode(settings, srcChain, dstChain, tokenID);
	switch (subSettings.bridgingMode) {
		case BridgingModeEnum.LayerZero:
			return layerZeroValidation(BigInt(amount), dstAddr);
		case BridgingModeEnum.Skyline:
			return skylineValidaton(
				srcChain,
				dstChain,
				dstAddr,
				BigInt(amount),
				tokenID,
				subSettings.settings!,
			);
		case BridgingModeEnum.Reactor:
			return reactorValidation(
				srcChain,
				dstChain,
				dstAddr,
				BigInt(amount),
				subSettings.settings!,
			);
		default:
			return `unknown direction ${srcChain} -> ${dstChain}`;
	}
};

function layerZeroValidation(
	amount: bigint,
	dstAddr: string,
): string | undefined {
	if (amount === BigInt(0)) {
		return 'Amount cant be zero';
	}
	if (!isAddress(dstAddr)) {
		return `Invalid destination address: ${dstAddr}`;
	}
}

function reactorValidation(
	srcChain: ChainEnum,
	dstChain: ChainEnum,
	dstAddr: string,
	amount: bigint,
	settings: SettingsResponseDto,
) {
	if (!settings) {
		return 'settings not provided';
	}

	const tokenInfo = getTokenInfo(
		getCurrencyID(settings.bridgingSettings, srcChain),
	);
	if (isCardanoChain(srcChain)) {
		const minAllowedToBridge = BigInt(settings.minValueToBridge);
		if (amount < minAllowedToBridge) {
			return `Amount too low. The minimum amount is ${convertUtxoDfmToApex(settings.minValueToBridge)} ${tokenInfo.label}`;
		}

		const maxAllowedToBridgeDfm = BigInt(settings.maxAmountAllowedToBridge);
		if (maxAllowedToBridgeDfm > 0 && amount > maxAllowedToBridgeDfm) {
			return `Amount more than maximum allowed: ${convertUtxoDfmToApex(maxAllowedToBridgeDfm.toString(10))} ${tokenInfo.label}`;
		}
	} else if (isEvmChain(srcChain)) {
		const minAllowedToBridge = BigInt(
			convertDfmToWei(settings.minValueToBridge),
		);
		if (amount < minAllowedToBridge) {
			return `Amount too low. The minimum amount is ${convertUtxoDfmToApex(settings.minValueToBridge)} ${tokenInfo.label}`;
		}

		const maxAllowedToBridgeWei = BigInt(
			convertDfmToWei(settings.maxAmountAllowedToBridge),
		);
		if (maxAllowedToBridgeWei > 0 && amount > maxAllowedToBridgeWei) {
			return `Amount more than maximum allowed: ${convertEvmDfmToApex(maxAllowedToBridgeWei.toString(10))} ${tokenInfo.label}`;
		}
	}

	if (isCardanoChain(dstChain)) {
		const addr = NewAddress(dstAddr);
		if (
			!addr ||
			addr instanceof RewardAddress ||
			dstAddr !== addr.String()
		) {
			return `Invalid destination address: ${dstAddr}`;
		}

		if (
			!checkCardanoAddressCompatibility(
				dstChain,
				addr,
				shouldUseMainnet(srcChain, dstChain),
			)
		) {
			return `Destination address not compatible with destination chain: ${dstChain}`;
		}
	} else if (isEvmChain(dstChain)) {
		if (!isAddress(dstAddr)) {
			return `Invalid destination address: ${dstAddr}`;
		}
	}
}

function skylineValidaton(
	srcChain: ChainEnum,
	dstChain: ChainEnum,
	dstAddr: string,
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

	let minValue = settings.bridgingSettings.minColCoinsAllowedToBridge;
	if (isWrappedCurrencyBridging) {
		minValue =
			settings.bridgingSettings.minUtxoChainValue[dstChain] ||
			settings.bridgingSettings.minValueToBridge;
	} else if (isCurrencyBridging) {
		minValue =
			settings.bridgingSettings.minUtxoChainValue[srcChain] ||
			settings.bridgingSettings.minValueToBridge;
	}

	const maxAllowed = isCurrencyBridging
		? settings.bridgingSettings.maxAmountAllowedToBridge
		: settings.bridgingSettings.maxTokenAmountAllowedToBridge;

	if (isCardanoChain(srcChain)) {
		const minValueBN = BigInt(minValue || '0');
		if (amount < minValueBN) {
			return `Amount too low. The minimum amount is ${convertUtxoDfmToApex(minValueBN.toString(10))} ${tokenInfo.label}`;
		}

		const maxAllowedToBridgeDfm = BigInt(maxAllowed || '0');
		if (maxAllowedToBridgeDfm > 0 && amount > maxAllowedToBridgeDfm) {
			return `Amount more than maximum allowed: ${convertUtxoDfmToApex(maxAllowedToBridgeDfm.toString(10))} ${tokenInfo.label}`;
		}
	} else if (isEvmChain(srcChain)) {
		const minValueWei = BigInt(convertDfmToWei(minValue || '0'));
		if (amount < minValueWei) {
			return `Amount too low. The minimum amount is ${convertUtxoDfmToApex(minValue || '0')} ${tokenInfo.label}`;
		}

		const maxAllowedWei = BigInt(convertDfmToWei(maxAllowed || '0'));
		if (maxAllowedWei > 0 && amount > maxAllowedWei) {
			return `Amount more than maximum allowed: ${convertEvmDfmToApex(maxAllowedWei.toString(10))} ${tokenInfo.label}`;
		}
	}

	if (isCardanoChain(dstChain)) {
		const addr = NewAddress(dstAddr);
		if (
			!addr ||
			addr instanceof RewardAddress ||
			dstAddr !== addr.String()
		) {
			return `Invalid destination address: ${dstAddr}`;
		}

		if (
			!checkCardanoAddressCompatibility(
				dstChain,
				addr,
				shouldUseMainnet(srcChain, dstChain),
			)
		) {
			return `Destination address not compatible with destination chain: ${dstChain}`;
		}
	} else if (isEvmChain(dstChain)) {
		if (!isAddress(dstAddr)) {
			return `Invalid destination address: ${dstAddr}`;
		}
	}
}
