import Web3 from 'web3';
import { TokenEnum } from '../features/enums';
import { getTokenInfo } from '../settings/token';
import { ChainEnum } from '../swagger/apexBridgeApiService';

const wapexInfo = getTokenInfo(TokenEnum.WAPEX);
const labelToEnumDict = Object.values(TokenEnum).reduce(
	(acc, token) => {
		acc[token as string] = getTokenInfo(token).label;
		return acc;
	},
	{
		[wapexInfo.label]: wapexInfo.label,
	},
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

	const candidates = [parts[1]];

	try {
		const decoded = Web3.utils.hexToAscii(parts[1]);
		candidates.push(decoded);
	} catch (_) {
		// do not need anything
	}

	for (const c of candidates) {
		const title = labelToEnumDict[c];
		if (title) {
			return title;
		}
	}

	return parts[1];
}

export const isApexChain = (c: string) =>
	c === ChainEnum.Prime || c === ChainEnum.Nexus || c === ChainEnum.Vector;
