import Web3 from 'web3';
import { isHex } from 'web3-validator';
import { ChainEnum } from '../swagger/apexBridgeApiService';

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
