import { ed25519 } from '@noble/curves/ed25519';

const BASE58_ALPHABET =
	'123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function decodeBase58(input: string): Uint8Array {
	const bytes: number[] = [0];
	for (const char of input) {
		const value = BASE58_ALPHABET.indexOf(char);
		if (value < 0) {
			throw new Error('invalid base58 character');
		}
		let carry = value;
		for (let i = 0; i < bytes.length; i++) {
			carry += bytes[i] * 58;
			bytes[i] = carry & 0xff;
			carry >>= 8;
		}
		while (carry > 0) {
			bytes.push(carry & 0xff);
			carry >>= 8;
		}
	}
	let leadingZeros = 0;
	for (const char of input) {
		if (char === '1') {
			leadingZeros++;
		} else {
			break;
		}
	}
	const decoded = new Uint8Array(leadingZeros + bytes.length);
	for (let i = 0; i < bytes.length; i++) {
		decoded[decoded.length - 1 - i] = bytes[i];
	}
	return decoded;
}

/** Validates a base58 Solana address is 32 bytes and on the ed25519 curve. */
export function isValidSolanaOnCurveAddress(address: string): boolean {
	try {
		const decoded = decodeBase58(address);
		if (decoded.length !== 32) {
			return false;
		}
		ed25519.ExtendedPoint.fromHex(decoded).assertValidity();
		return true;
	} catch {
		return false;
	}
}
