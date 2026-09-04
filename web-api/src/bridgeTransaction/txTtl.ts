import { Logger } from '@nestjs/common';
import { ChainEnum } from 'src/common/enum';
import { isSolanaChain } from 'src/utils/chainUtils';
import { serializeSolanaTxRawStorage } from 'src/utils/solanaTxRaw';
import { getLatestBlockOrSlot } from 'src/blockchain/latestBlock';
import {
	getTxTTL,
	serializeConstructedTxRaw,
} from './bridgeTransaction.helper';

const DEFAULT_TTL_MAX_AHEAD = 5000;
const DEFAULT_TTL_OFFSET = 1800;

const TTL_MAX_CHAIN_TTL_AHEAD: { [chain: string]: number } = {
	[ChainEnum.Ethereum]: 3000, // 12s (~10h)
	[ChainEnum.Nexus]: 5000, // 2s (~2.8h)
	[ChainEnum.Polygon]: 5000, // 2s (~2.8h)
	[ChainEnum.Base]: 5000, // 2s (~2.8h)
	[ChainEnum.Scroll]: 5000, // 3s (~4.2h)
	[ChainEnum.Katana]: 10000, // 1s (~2.8h)
	[ChainEnum.BNB]: 20000, // 450ms (~2.5h)
	[ChainEnum.Sei]: 25000, // 400ms (~2.8h)
	[ChainEnum.Unichain]: 40000, // 200–250ms (~2.8h)
	[ChainEnum.Arbitrum]: 40000, // 250ms (~2.8h)
	[ChainEnum.Cardano]: 8000,
	[ChainEnum.Prime]: 8000,
	[ChainEnum.Vector]: 8000,
	[ChainEnum.Solana]: 25000, // ~400ms (~2.8h)
};

const TTL_CHAIN_OFFSET: { [chain: string]: number } = {
	[ChainEnum.Ethereum]: 300, // 12s
	[ChainEnum.Nexus]: 1800, // 2s
	[ChainEnum.Polygon]: 1800, // 2s
	[ChainEnum.Katana]: 3600, // 1s
	[ChainEnum.Base]: 1800, // 2s
	[ChainEnum.BNB]: 8000, // 450ms
	[ChainEnum.Scroll]: 1200, // 3s
	[ChainEnum.Unichain]: 14400, // 200–250ms
	[ChainEnum.Sei]: 9000, // 400ms
	[ChainEnum.Arbitrum]: 14400, // 250ms
	[ChainEnum.Solana]: 9000, // ~400ms
	[ChainEnum.Cardano]: 3600, // 1s slots
	[ChainEnum.Prime]: 3600,
	[ChainEnum.Vector]: 3600,
};

export const shouldConstructTtl = (
	parsedTtl: bigint | undefined,
	latest: bigint,
	maxAhead: bigint,
): boolean => parsedTtl === undefined || parsedTtl > latest + maxAhead;

export const getTtlMaxAhead = (chain: ChainEnum): bigint => {
	const fromMap = TTL_MAX_CHAIN_TTL_AHEAD[chain];
	if (fromMap !== undefined) {
		return BigInt(fromMap);
	}
	return BigInt(DEFAULT_TTL_MAX_AHEAD);
};

export const getTtlOffset = (chain: ChainEnum): bigint => {
	const fromMap = TTL_CHAIN_OFFSET[chain];
	if (fromMap !== undefined) {
		return BigInt(fromMap);
	}
	return BigInt(DEFAULT_TTL_OFFSET);
};

const prepareFrontendTxRaw = (
	chain: ChainEnum,
	txRaw?: string,
	lastValidBlockHeight?: string,
): string | undefined => {
	const trimmed = txRaw?.trim();
	if (isSolanaChain(chain) && lastValidBlockHeight && trimmed) {
		return serializeSolanaTxRawStorage(trimmed, lastValidBlockHeight);
	}
	if (isSolanaChain(chain) && lastValidBlockHeight) {
		return serializeSolanaTxRawStorage('', lastValidBlockHeight);
	}
	return trimmed || undefined;
};

export const resolveTxRaw = async (
	chain: ChainEnum,
	txRaw?: string,
	lastValidBlockHeight?: string,
): Promise<string> => {
	const prepared = prepareFrontendTxRaw(chain, txRaw, lastValidBlockHeight);
	const parsedTtl = prepared ? getTxTTL(chain, prepared) : undefined;
	const latest = await getLatestBlockOrSlot(chain);
	const maxAhead = getTtlMaxAhead(chain);

	if (!shouldConstructTtl(parsedTtl, latest, maxAhead)) {
		return prepared!;
	}

	const offset = getTtlOffset(chain);
	const ttl = latest + offset;
	const reason =
		parsedTtl === undefined
			? 'txRaw missing or TTL unreadable'
			: `TTL ${parsedTtl} exceeds latest ${latest} + maxAhead ${maxAhead}`;

	Logger.warn(
		`Constructing TTL for ${chain}: ${reason}. ttl=${ttl.toString()}`,
	);

	return serializeConstructedTxRaw(ttl);
};
