import { Logger } from '@nestjs/common';
import { ChainEnum } from 'src/common/enum';
import { getLatestBlockOrSlot } from 'src/blockchain/latestBlock';
import {
	getTxTTL,
	serializeConstructedTxRaw,
} from './bridgeTransaction.helper';

const DEFAULT_TTL_MAX_AHEAD = 5000;
const DEFAULT_TTL_OFFSET = 1800;

const TTL_MAX_CHAIN_TTL_AHEAD: { [chain: string]: number } = {
	[ChainEnum.Nexus]: 5000, // 2s (~2.8h)
	[ChainEnum.Prime]: 8000,
	[ChainEnum.Vector]: 8000,
};

const TTL_CHAIN_OFFSET: { [chain: string]: number } = {
	[ChainEnum.Nexus]: 1800, // 2s
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

const prepareFrontendTxRaw = (txRaw?: string): string | undefined => {
	const trimmed = txRaw?.trim();

	return trimmed || undefined;
};

export const resolveTxRaw = async (
	chain: ChainEnum,
	txRaw?: string,
): Promise<string> => {
	const prepared = prepareFrontendTxRaw(txRaw);
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
