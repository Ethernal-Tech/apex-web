export type SolanaTxRawStorage = {
	txRaw: string;
	blockHash: string;
};

export function serializeSolanaTxRawStorage(
	txRaw: string,
	blockHash: string,
): string {
	return JSON.stringify({ txRaw, blockHash } satisfies SolanaTxRawStorage);
}

/** Parses Solana txRaw from DB; supports legacy plain base64 and JSON storage. */
export function parseSolanaTxRawStorage(stored: string): {
	txRaw: string;
	blockHash?: string;
} {
	try {
		const parsed = JSON.parse(stored) as Partial<SolanaTxRawStorage>;
		if (parsed?.txRaw && typeof parsed.txRaw === 'string') {
			return {
				txRaw: parsed.txRaw,
				blockHash:
					typeof parsed.blockHash === 'string' ? parsed.blockHash : undefined,
			};
		}
	} catch {
		// legacy: stored value is raw base64 transaction bytes
	}

	return { txRaw: stored };
}
