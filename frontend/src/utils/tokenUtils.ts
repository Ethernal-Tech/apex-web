import Web3 from 'web3';
import { TokenEnum } from '../features/enums';
import { getTokenInfo } from '../settings/token';
import { ChainEnum } from '../swagger/apexBridgeApiService';

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

	try {
		const decoded = Web3.utils.hexToAscii(parts[1]);

    return decoded;
	} catch (_) {
		return parts[1];
	}
}

export const isApexChain = (c: string) =>
	c === ChainEnum.Prime || c === ChainEnum.Nexus || c === ChainEnum.Vector;
