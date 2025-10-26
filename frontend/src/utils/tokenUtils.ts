import Web3 from 'web3';
import { isHex } from 'web3-validator';
import { TokenEnum } from '../features/enums';
import { getCurrencyTokenInfo, getTokenInfo } from '../settings/token';
import { ChainEnum } from '../swagger/apexBridgeApiService';
import { LovelaceTokenName } from './chainUtils';
import { toChainEnum } from '../settings/chain';
import { CardanoChainsNativeTokens } from '../settings/settingsRedux';

export function decodeTokenKey(tokenKey: string, chain?: string): string {
	if (tokenKey === LovelaceTokenName || tokenKey === 'amount') {
		switch (chain) {
			case ChainEnum.Cardano:
				return getTokenInfo(TokenEnum.ADA).label;
			default:
				return getTokenInfo(TokenEnum.APEX).label;
		}
	}

	const parts = tokenKey.split('.');
	if (parts.length < 2) {
		return tokenKey;
	}
	// first try to find label for (already decoded) token name ...
	const tokenName = parts[1];

	const tokenInfo = getTokenInfo(tokenName as TokenEnum);
	if (tokenInfo.label) {
		return tokenInfo.label;
	}

	try {
		// ... then try to decode the name ...
		// ... if decoding succeeds and a label exists, return the label; otherwise, return the decoded name
		const decodedTokenName = Web3.utils.hexToAscii(tokenName);
		const tokenInfo = getTokenInfo(decodedTokenName as TokenEnum);
		return tokenInfo?.label || decodedTokenName;
	} catch (_) {
		// ... if decoding fails, return the original token name
		return tokenName;
	}
}

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

const normalizeNativeTokenKey = (k: string) => {
	if (!k.includes('.')) return k;

	const kParts = k.split('.');
	if (kParts.length > 2) throw new Error(`invalid native token key: ${k}`);

	let name = kParts[1];
	try {
		name = Web3.utils.hexToAscii(name);
	} catch {
		/* empty */
	}

	return `${kParts[0]}${name}`;
};

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
