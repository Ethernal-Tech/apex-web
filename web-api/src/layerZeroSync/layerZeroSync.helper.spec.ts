import { ChainEnum, TransactionStatusEnum } from 'src/common/enum';
import {
	decodeOftPayload,
	LayerZeroMessage,
	parseLayerZeroMessage,
} from './layerZeroScan.helper';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import {
	applyLayerZeroMessage,
	LayerZeroMappingContext,
	mapLayerZeroMessage,
} from './layerZeroSync.helper';

const receiver =
	'00000000000000000000000012345678901234567890abcdef1234567890abcd';
// 1.5 in shared (6) decimals
const amountSD = (1_500_000).toString(16).padStart(16, '0');
const oftPayload = `0x${receiver}${amountSD}`;

const message = (
	overrides: Partial<LayerZeroMessage> = {},
): LayerZeroMessage => ({
	status: TransactionStatusEnum.SubmittedToBridge,
	pathway: { srcEid: 30101, dstEid: 30184 },
	source: {
		txHash: '0xABCD',
		from: '0xSENDER',
		sentAt: new Date('2026-10-12T10:00:00Z'),
	},
	destination: {},
	payload: oftPayload,
	...overrides,
});

const ctx: LayerZeroMappingContext = {
	chainOfEid: (eid) =>
		({ 30101: ChainEnum.Nexus, 30184: ChainEnum.Base })[eid] as
			| ChainEnum
			| undefined,
	tokenIDOf: (origin) => (origin === ChainEnum.Nexus ? 0 : 7),
	conversionRateOf: () => BigInt(10) ** BigInt(12),
};

describe('decodeOftPayload', () => {
	it('reads receiver and amount', () => {
		expect(decodeOftPayload(oftPayload)).toEqual({
			receiver: '0x12345678901234567890abcdef1234567890abcd',
			amountSD: BigInt(1_500_000),
		});
	});

	it('rejects bodies that are not OFT transfers', () => {
		expect(decodeOftPayload(undefined)).toBeUndefined();
		expect(decodeOftPayload('0x1234')).toBeUndefined();
		expect(decodeOftPayload(`0x${'zz'.repeat(41)}`)).toBeUndefined();
	});
});

describe('parseLayerZeroMessage', () => {
	it('parses the fields of a scan message', () => {
		const parsed = parseLayerZeroMessage({
			pathway: { srcEid: 1, dstEid: 2 },
			source: {
				status: 'SUCCEEDED',
				tx: {
					txHash: '0xa',
					from: '0xb',
					blockTimestamp: 1760000000,
					payload: '0x1',
				},
			},
			destination: { status: 'WAITING' },
			status: { name: 'INFLIGHT' },
		});

		expect(parsed.status).toBe(TransactionStatusEnum.SubmittedToBridge);
		expect(parsed.pathway).toEqual({ srcEid: 1, dstEid: 2 });
		expect(parsed.source.sentAt).toEqual(new Date(1760000000 * 1000));
		expect(parsed.destination.txHash).toBeUndefined();
	});
});

describe('mapLayerZeroMessage', () => {
	it('maps a currency transfer to the amount columns', () => {
		const result = mapLayerZeroMessage(message(), ctx);
		if (!('entity' in result)) throw new Error(result.skipReason);

		const { entity } = result;
		expect(entity.sourceTxHash).toBe('0xabcd');
		expect(entity.originChain).toBe(ChainEnum.Nexus);
		expect(entity.destinationChain).toBe(ChainEnum.Base);
		expect(entity.senderAddress).toBe('0xsender');
		expect(entity.receiverAddresses).toBe(
			'0x12345678901234567890abcdef1234567890abcd',
		);
		expect(entity.amount).toBe('1500000000000000000');
		expect(entity.amountWei).toBe('1500000000000000000');
		expect(entity.nativeTokenAmount).toBe('0');
		expect(entity.tokenID).toBe(0);
		expect(entity.isLayerZero).toBe(true);
		expect(entity.status).toBe(TransactionStatusEnum.SubmittedToBridge);
		expect(entity.finishedAt).toBeUndefined();
	});

	it('maps a token transfer to the token columns and finishes delivered ones', () => {
		const deliveredAt = new Date('2026-10-12T10:05:00Z');
		const result = mapLayerZeroMessage(
			message({
				pathway: { srcEid: 30184, dstEid: 30101 },
				status: TransactionStatusEnum.ExecutedOnDestination,
				destination: { txHash: '0xdst', deliveredAt },
			}),
			ctx,
		);
		if (!('entity' in result)) throw new Error(result.skipReason);

		expect(result.entity.amount).toBe('0');
		expect(result.entity.nativeTokenAmount).toBe('1500000000000000000');
		expect(result.entity.tokenID).toBe(7);
		expect(result.entity.destinationTxHash).toBe('0xdst');
		expect(result.entity.finishedAt).toEqual(deliveredAt);
	});

	it('skips messages it can not map', () => {
		expect(
			'skipReason' in
				mapLayerZeroMessage(
					message({ pathway: { srcEid: 1, dstEid: 30184 } }),
					ctx,
				),
		).toBe(true);
		expect(
			'skipReason' in mapLayerZeroMessage(message({ payload: '0x' }), ctx),
		).toBe(true);
		expect(
			'skipReason' in
				mapLayerZeroMessage(message({ source: { txHash: undefined } }), ctx),
		).toBe(true);
	});
});

describe('applyLayerZeroMessage', () => {
	const stored = (overrides: Partial<BridgeTransaction> = {}) =>
		Object.assign(new BridgeTransaction(), {
			sourceTxHash: '0xabcd',
			senderAddress: '0xsender',
			status: TransactionStatusEnum.SubmittedToBridge,
			isLayerZero: true,
			...overrides,
		});

	it('fills in a sender scan did not have when the transfer was recorded', () => {
		const entity = stored({ senderAddress: '' });

		expect(applyLayerZeroMessage(entity, message())).toBe(true);
		expect(entity.senderAddress).toBe('0xsender');
	});

	it('keeps a stored sender', () => {
		const entity = stored({ senderAddress: '0xstored' });

		expect(applyLayerZeroMessage(entity, message())).toBe(false);
		expect(entity.senderAddress).toBe('0xstored');
	});

	it('finishes a delivered transfer with its destination tx and delivery time', () => {
		const deliveredAt = new Date('2026-10-12T10:05:00Z');
		const entity = stored();

		expect(
			applyLayerZeroMessage(
				entity,
				message({
					status: TransactionStatusEnum.ExecutedOnDestination,
					destination: { txHash: '0xdst', deliveredAt },
				}),
			),
		).toBe(true);
		expect(entity.status).toBe(TransactionStatusEnum.ExecutedOnDestination);
		expect(entity.destinationTxHash).toBe('0xdst');
		expect(entity.finishedAt).toEqual(deliveredAt);
	});

	it('fills in the destination tx of a transfer finished without it', () => {
		const deliveredAt = new Date('2026-10-12T10:05:00Z');
		const entity = stored({
			status: TransactionStatusEnum.ExecutedOnDestination,
			finishedAt: new Date('2026-10-12T11:00:00Z'),
		});

		expect(
			applyLayerZeroMessage(
				entity,
				message({
					status: TransactionStatusEnum.ExecutedOnDestination,
					destination: { txHash: '0xdst', deliveredAt },
				}),
			),
		).toBe(true);
		expect(entity.destinationTxHash).toBe('0xdst');
		expect(entity.finishedAt).toEqual(deliveredAt);
	});

	it('reports no change for an up to date transfer', () => {
		const deliveredAt = new Date('2026-10-12T10:05:00Z');
		const entity = stored({
			status: TransactionStatusEnum.ExecutedOnDestination,
			destinationTxHash: '0xdst',
			finishedAt: deliveredAt,
		});

		expect(
			applyLayerZeroMessage(
				entity,
				message({
					status: TransactionStatusEnum.ExecutedOnDestination,
					destination: { txHash: '0xdst', deliveredAt },
				}),
			),
		).toBe(false);
	});
});
