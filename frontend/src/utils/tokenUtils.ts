import Web3 from 'web3';
import { TokenEnum } from '../features/enums';
import { getTokenInfo } from '../settings/token';
import { ChainEnum } from '../swagger/apexBridgeApiService';

const labelToEnumDict = Object.values(TokenEnum).reduce(
	(acc, token) => {
		acc[token as string] = getTokenInfo(token).label;
		return acc;
	},
	{} as { [key: string]: string },
);

export function decodeTokenKey(tokenKey: string, chain?: string): string {
	if (tokenKey === 'lovelace' || tokenKey === 'amount') {
		switch (chain) {
			case ChainEnum.Cardano:
				return getTokenInfo(TokenEnum.Ada).label;
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

	const title = labelToEnumDict[tokenName];
	if (title) {
		return title;
	}

	try {
		// ... then try to decode the name ...
		// ... if decoding succeeds and a label exists, return the label; otherwise, return the decoded name
		const decodedTokenName = Web3.utils.hexToAscii(tokenName);
		return labelToEnumDict[decodedTokenName] || decodedTokenName;
	} catch (_) {
		// ... if decoding fails, return the original token name
		return tokenName;
	}
}

export const isApexChain = (c: string) =>
	c === ChainEnum.Prime || c === ChainEnum.Nexus || c === ChainEnum.Vector;
