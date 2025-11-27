import Web3 from 'web3';
import { isHex } from 'web3-validator';

export const normalizeNativeTokenKey = (k: string) => {
	if (!k.includes('.')) return k;

	const kParts = k.split('.');
	if (kParts.length > 2)
		captureAndThrowError(
			`invalid native token key: ${k}`,
			'tokenUtils.ts',
			'normalizeNativeTokenKey',
		);

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
