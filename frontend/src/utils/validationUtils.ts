import { isAddress } from 'web3-validator';
import { PublicKey } from '@solana/web3.js';
import {
	BridgingModeEnum,
	getBridgingMode,
	isCardanoChain,
	isEvmChain,
	isSolanaChain,
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
	convertWeiToDfm,
	convertEvmDfmToApex,
	convertUtxoDfmToApex,
	convertWeiToDfmByChain,
	shouldUseMainnet,
	convertDfmToApex,
	convertLamportsToWei,
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

const isValidSolanaOnCurveAddress = (address: string): boolean => {
	try {
		const publicKey = new PublicKey(address);
		return PublicKey.isOnCurve(publicKey.toBytes());
	} catch {
		return false;
	}
};

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
			settings.bridgingSettings.minColCoinsAllowedToBridge[srcChain] ||
				'0',
		);
		const minColCoinsAllowedDest = BigInt(
			settings.bridgingSettings.minColCoinsAllowedToBridge[dstChain] ||
				'0',
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
	const minValueWei = BigInt(
		convertWeiToDfmByChain(minValue || '0', srcChain),
	);
	if (amount < minValueWei) {
		return `Amount too low. The minimum amount is ${convertDfmToApex(minValueWei.toString(10), srcChain)} ${tokenInfo.label}`;
	}

	const maxAllowedToBridgeDfm = BigInt(
		convertWeiToDfmByChain(maxAllowed || '0', srcChain), // returns wei for evm chains
	);
	if (maxAllowedToBridgeDfm > 0 && amount > maxAllowedToBridgeDfm) {
		return `Amount more than maximum allowed: ${convertDfmToApex(maxAllowedToBridgeDfm.toString(10), srcChain)} ${tokenInfo.label}`;
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
	} else if (isSolanaChain(dstChain)) {
		if (!isValidSolanaOnCurveAddress(dstAddr)) {
			return `Invalid destination address: ${dstAddr}`;
		}
	}
}
