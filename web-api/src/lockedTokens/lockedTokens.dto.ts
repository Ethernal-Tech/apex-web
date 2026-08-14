import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmptyObject, IsObject } from 'class-validator';

export class LockedTokensDto {
	@ApiProperty({
		description: 'Per chain → token → address → amoumt.',
		type: 'object',
		additionalProperties: {
			type: 'object',
			additionalProperties: {
				type: 'object',
				additionalProperties: { type: 'string' },
			},
		},
	})
	chains: {
		[chainName: string]: Record<number, { [address: string]: string }>;
	};

	@ApiProperty({
		description: 'Mapping of total transferred tokens per chain',
		type: 'object',
		additionalProperties: {
			type: 'object',
			additionalProperties: { type: 'string' },
		},
	})
	totalTransferred: { [key: string]: { [innerKey: string]: string } };
}

/**
 * The headline figures only. Computing them takes everything `/lockedTokens`
 * does plus the cached token prices, so they are served from a cache the
 * locked-tokens computation refreshes - see `LockedTokensService.getSummary`.
 */
export class LockedTokensSummaryDto {
	@ApiProperty({
		description: 'Total value locked, in USD.',
		example: 12450238.71,
	})
	tvlUsd: number;

	@ApiProperty({
		description: 'Total value bridged, in USD.',
		example: 84120933.4,
	})
	tvbUsd: number;

	@ApiProperty({
		description: 'When these figures were computed (ISO 8601).',
		example: '2026-08-14T09:12:04.180Z',
	})
	computedAt: string;
}

export class LockedTokensResponse {
	@ApiProperty({
		description: 'Per chain → token → address → amoumt.',
		type: 'object',
		additionalProperties: {
			type: 'object',
			additionalProperties: {
				type: 'object',
				additionalProperties: { type: 'string' },
			},
		},
	})
	@IsObject()
	@IsNotEmptyObject()
	chains!: {
		[chainName: string]: { [tokenName: string]: { [address: string]: string } };
	};
}

export class TransferredTokensResponse {
	@ApiProperty({
		description: 'Mapping of total transfered tokens per chain',
		type: 'object',
		additionalProperties: {
			type: 'object',
			additionalProperties: { type: 'string' },
		},
	})
	totalTransferred: { [key: string]: { [innerKey: string]: string } };
}

export class TransferredTokensByDay {
	@ApiProperty({
		description: 'The date of the transaction or event (YYYY-MM-DD).',
		type: String,
		example: '2025-07-24',
		format: 'date',
	})
	date: Date;

	@ApiProperty({
		description: 'Mapping of total transfered tokens per chain for day',
		type: 'object',
		additionalProperties: {
			type: 'object',
			additionalProperties: { type: 'string' },
		},
	})
	totalTransferred: { [key: string]: { [innerKey: string]: string } };
}

export class HistoricalSnapshotDto {
	@ApiProperty({
		description: 'Snapshot timestamp (UTC).',
		type: String,
		format: 'date-time',
		example: '2026-07-28T00:00:00.000Z',
	})
	snapshotAt: Date;

	@ApiProperty({
		description: 'Locked amounts per chain → token ID.',
		type: 'object',
		additionalProperties: {
			type: 'object',
			additionalProperties: { type: 'string' },
		},
	})
	tvlByChain: { [chain: string]: { [tokenId: string]: string } };

	@ApiProperty({
		description: 'LayerZero locked APEX amount (DFM units).',
		type: String,
		example: '0',
	})
	tvlLayerZeroApex: string;

	@ApiProperty({
		description: 'Bridged amounts per origin chain → token ID.',
		type: 'object',
		additionalProperties: {
			type: 'object',
			additionalProperties: { type: 'string' },
		},
	})
	tvbByChain: { [chain: string]: { [tokenId: string]: string } };

	@ApiProperty({
		description: 'Total locked APEX (headline TVL).',
		type: String,
	})
	tvlApex: string;

	@ApiProperty({
		description: 'Total locked ADA (headline TVL).',
		type: String,
	})
	tvlAda: string;

	@ApiProperty({
		description: 'Total bridged APEX (headline TVB).',
		type: String,
	})
	tvbApex: string;

	@ApiProperty({
		description: 'Total bridged ADA (headline TVB).',
		type: String,
	})
	tvbAda: string;
}
