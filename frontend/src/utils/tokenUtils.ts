import Web3 from 'web3';
import { isHex } from 'web3-validator';
import { captureAndThrowError } from '../features/sentry';
import appSettings from '../settings/appSettings';

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

export const formatBalance = (value: string | number | undefined): string => {
	if (!value) return '0';

	const stringValue = value.toString();

	if (!appSettings.balanceFormatting) {
		return stringValue;
	}

	const parts = stringValue.split('.');
	parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

	return parts.join('.');
};
