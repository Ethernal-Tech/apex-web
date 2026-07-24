/** Legacy Solana transaction helpers */

export function base64ToUint8Array(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

/** Reads Solana compact-u16 length prefix; returns [value, bytesConsumed]. */
function decodeCompactU16(bytes: Uint8Array, offset: number): [number, number] {
	let size = 0;
	let value = 0;

	for (;;) {
		if (offset + size >= bytes.length) {
			throw new Error('Invalid compact-u16: unexpected end of data');
		}
		const elem = bytes[offset + size];
		value |= (elem & 0x7f) << (size * 7);
		size += 1;
		if ((elem & 0x80) === 0) {
			break;
		}
		if (size > 3) {
			throw new Error('Invalid compact-u16: length prefix too long');
		}
	}

	return [value, size];
}

/** Extracts the message bytes from a legacy serialized transaction. */
export function extractMessageFromLegacyTransaction(
	serializedTx: Uint8Array,
): Uint8Array {
	const [signatureCount, prefixLen] = decodeCompactU16(serializedTx, 0);
	const messageOffset = prefixLen + signatureCount * 64;

	if (messageOffset >= serializedTx.length) {
		throw new Error('Invalid legacy transaction: missing message');
	}

	return serializedTx.slice(messageOffset);
}

/** Minimal transaction shape Phantom accepts for pre-built server transactions. */
export function createPhantomTransactionAdapter(serializedTx: Uint8Array): {
	serialize: () => Uint8Array;
	serializeMessage: () => Uint8Array;
} {
	return {
		serialize: () => serializedTx,
		serializeMessage: () =>
			extractMessageFromLegacyTransaction(serializedTx),
	};
}
