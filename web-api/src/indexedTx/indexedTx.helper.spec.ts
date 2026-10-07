import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { getTxTTL } from 'src/bridgeTransaction/bridgeTransaction.helper';
import { ChainEnum, TransactionStatusEnum } from 'src/common/enum';
import { BridgingSettingsDirectionConfigDto } from 'src/settings/settings.dto';
import {
	applyIndexedTx,
	IndexedBridgingTx,
	mapIndexedTxToEntityFields,
} from './indexedTx.helper';

const lovelace = 'lovelace';

const directionConfig = {
	prime: {
		tokens: { 1: { chainSpecific: lovelace }, 2: { chainSpecific: 'wapex' } },
	},
	nexus: {
		tokens: { 3: { chainSpecific: lovelace }, 4: { chainSpecific: '0xtoken' } },
	},
	solana: {
		tokens: { 5: { chainSpecific: lovelace }, 6: { chainSpecific: 'mint' } },
	},
} as unknown as { [key: string]: BridgingSettingsDirectionConfigDto };

const baseTx = (overrides: Partial<IndexedBridgingTx>): IndexedBridgingTx => ({
	seq: 1,
	originChainId: 'prime',
	txHash: 'abcd',
	destinationChainId: 'nexus',
	senderAddr: 'addr_test1sender',
	receivers: [],
	bridgingFee: '0',
	operationFee: '0',
	value: '0',
	blockNumber: 10,
	blockHash: 'bh',
	ttl: 0,
	isLayerZero: false,
	indexedAt: '2026-10-07T10:00:00Z',
	...overrides,
});

describe('mapIndexedTxToEntityFields', () => {
	it('maps cardano currency bridging like the frontend did', () => {
		const fields = mapIndexedTxToEntityFields(
			baseTx({
				receivers: [{ address: '0xreceiver', amount: '5000000', tokenID: 1 }],
				bridgingFee: '1000000',
				operationFee: '200000',
				value: '6200000',
			}),
			directionConfig,
		);

		expect(fields).toEqual({
			sourceTxHash: 'abcd',
			originChain: ChainEnum.Prime,
			destinationChain: ChainEnum.Nexus,
			senderAddress: 'addr_test1sender',
			receiverAddresses: '0xreceiver',
			amount: '6200000',
			amountWei: '6200000000000000000',
			nativeTokenAmount: '0',
			tokenAmountWei: '0',
			tokenID: 0,
			isLayerZero: false,
		});
	});

	it('maps cardano token bridging and old metadata without token ID', () => {
		const fields = mapIndexedTxToEntityFields(
			baseTx({
				receivers: [
					{ address: '0xreceiver', amount: '300', tokenID: 2 },
					{ address: '0xreceiver', amount: '1000', tokenID: 0 },
				],
				bridgingFee: '100',
			}),
			directionConfig,
		);

		expect(fields?.amount).toBe('1100');
		expect(fields?.nativeTokenAmount).toBe('300');
		expect(fields?.tokenID).toBe(2);
		expect(fields?.receiverAddresses).toBe('0xreceiver, 0xreceiver');
	});

	it('uses tx value as amount on EVM chains', () => {
		const fields = mapIndexedTxToEntityFields(
			baseTx({
				originChainId: 'nexus',
				destinationChainId: 'prime',
				receivers: [{ address: 'addr_test1r', amount: '700', tokenID: 4 }],
				bridgingFee: '30',
				operationFee: '5',
				value: '35',
			}),
			directionConfig,
		);

		expect(fields?.amount).toBe('35');
		expect(fields?.amountWei).toBe('35');
		expect(fields?.nativeTokenAmount).toBe('700');
		expect(fields?.tokenID).toBe(4);
	});

	it('maps solana SPL token and currency bridging', () => {
		const token = mapIndexedTxToEntityFields(
			baseTx({
				originChainId: 'solana',
				receivers: [{ address: '0xr', amount: '700', tokenID: 6 }],
				bridgingFee: '30',
				operationFee: '5',
			}),
			directionConfig,
		);

		expect(token?.amount).toBe('35');
		expect(token?.nativeTokenAmount).toBe('700');
		expect(token?.tokenID).toBe(6);

		const currency = mapIndexedTxToEntityFields(
			baseTx({
				originChainId: 'solana',
				receivers: [{ address: '0xr', amount: '700', tokenID: 5 }],
				bridgingFee: '30',
				operationFee: '5',
			}),
			directionConfig,
		);

		expect(currency?.amount).toBe('735');
		expect(currency?.tokenID).toBe(0);
	});

	it('maps layer zero native and token OFT transfers', () => {
		const native = mapIndexedTxToEntityFields(
			baseTx({
				originChainId: 'nexus',
				destinationChainId: 'base',
				isLayerZero: true,
				receivers: [{ address: '0xr', amount: '1000', tokenID: 0 }],
				value: '1010',
			}),
			directionConfig,
		);

		expect(native?.amount).toBe('1010');
		expect(native?.nativeTokenAmount).toBe('0');
		expect(native?.tokenID).toBe(0);
		expect(native?.isLayerZero).toBe(true);

		const token = mapIndexedTxToEntityFields(
			baseTx({
				originChainId: 'base',
				destinationChainId: 'nexus',
				isLayerZero: true,
				receivers: [{ address: '0xr', amount: '1000', tokenID: 0 }],
				value: '10',
			}),
			directionConfig,
		);

		expect(token?.amount).toBe('10');
		expect(token?.nativeTokenAmount).toBe('1000');
		expect(token?.tokenID).toBe(3);
	});

	it('returns undefined for unknown chains', () => {
		expect(
			mapIndexedTxToEntityFields(
				baseTx({ destinationChainId: 'unknown' }),
				directionConfig,
			),
		).toBeUndefined();
	});
});

describe('applyIndexedTx', () => {
	const now = new Date('2026-10-07T12:00:00Z');

	it('creates an active pending tx with ttl', () => {
		const tx = baseTx({
			ttl: 1234,
			receivers: [{ address: 'r', amount: '1', tokenID: 1 }],
		});
		const entity = applyIndexedTx(
			undefined,
			tx,
			mapIndexedTxToEntityFields(tx, directionConfig)!,
			now,
		);

		expect(entity.status).toBe(TransactionStatusEnum.Pending);
		expect(entity.createdAt).toEqual(new Date('2026-10-07T10:00:00Z'));
		expect(entity.activeFrom).toEqual(now);
		expect(entity.clientID).toBeNull();
		expect(getTxTTL(ChainEnum.Prime, entity.txRaw)).toBe(BigInt(1234));
	});

	it('overwrites request data of an existing tx and keeps its state', () => {
		const existing = new BridgeTransaction();
		existing.id = 7;
		existing.sourceTxHash = 'abcd';
		existing.amount = '999999';
		existing.senderAddress = 'fake';
		existing.status = TransactionStatusEnum.SubmittedToBridge;
		existing.destinationTxHash = 'dst';
		existing.txRaw = 'original';
		existing.createdAt = new Date('2026-10-07T09:00:00Z');
		existing.activeFrom = new Date('2026-10-07T13:00:00Z');
		existing.clientID = 'client';

		const tx = baseTx({
			ttl: 1234,
			receivers: [{ address: 'r', amount: '5', tokenID: 1 }],
		});
		const entity = applyIndexedTx(
			existing,
			tx,
			mapIndexedTxToEntityFields(tx, directionConfig)!,
			now,
		);

		expect(entity).toBe(existing);
		expect(entity.id).toBe(7);
		expect(entity.amount).toBe('5');
		expect(entity.senderAddress).toBe('addr_test1sender');
		expect(entity.status).toBe(TransactionStatusEnum.SubmittedToBridge);
		expect(entity.destinationTxHash).toBe('dst');
		expect(entity.txRaw).toBe('original');
		expect(entity.createdAt).toEqual(new Date('2026-10-07T09:00:00Z'));
		expect(entity.activeFrom).toEqual(now);
		expect(entity.clientID).toBeNull();
	});
});
