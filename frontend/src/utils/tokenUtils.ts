import Web3 from 'web3';
import { isHex } from 'web3-validator';
import { getCurrencyTokenInfo, getTokenInfo } from '../settings/token';
import { ChainEnum } from '../swagger/apexBridgeApiService';
import { LovelaceTokenName } from './chainUtils';
import { toChainEnum } from '../settings/chain';
import { CardanoChainsNativeTokens } from '../settings/settingsRedux';

export const normalizeNativeTokenKey = (k: string) => {
	if (!k.includes('.')) return k;

	const kParts = k.split('.');
	if (kParts.length > 2) throw new Error(`invalid native token key: ${k}`);

	let name = kParts[1];
	if (!isHex(name)) {
		try {
			name = Web3.utils.asciiToHex(name).substring(2);
		} catch {
			/* empty */
		}
	}

	return `${kParts[0]}${name}`;
};

export const isApexChain = (c: string) =>
	c === ChainEnum.Prime || c === ChainEnum.Nexus || c === ChainEnum.Vector;

export const correlateTokenToACurrency = (
	cardanoChainsNativeTokens: CardanoChainsNativeTokens,
	chain: ChainEnum,
	tokenKey: string,
) => {
	if (tokenKey === LovelaceTokenName || tokenKey === 'amount') {
		return getCurrencyTokenInfo(chain);
	}

	const chainSettingsTokens = cardanoChainsNativeTokens[chain];
	if (!chainSettingsTokens) return;

	const tokenSettings = chainSettingsTokens.find(
		(x) =>
			normalizeNativeTokenKey(x.tokenName) ===
			normalizeNativeTokenKey(tokenKey),
	);

	if (!tokenSettings) return;

	const currencyChain = toChainEnum(tokenSettings.dstChainID);
	if (currencyChain) {
		return getCurrencyTokenInfo(currencyChain);
	}
};
