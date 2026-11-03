export type SolanaTxRawStorage = {
	txRaw: string;
	lastValidBlockHeight: string;
};

export function parseSolanaTxRawStorage(stored: string): {
	txRaw: string;
	lastValidBlockHeight?: string;
} {
	try {
		const parsed = JSON.parse(stored) as Partial<SolanaTxRawStorage>;
		if (parsed?.txRaw && typeof parsed.txRaw === 'string') {
			return {
				txRaw: parsed.txRaw,
				lastValidBlockHeight:
					typeof parsed.lastValidBlockHeight === 'string'
						? parsed.lastValidBlockHeight
						: undefined,
			};
		}
	} catch {
		// legacy: stored value is raw base64 transaction bytes
	}

	return { txRaw: stored };
}
