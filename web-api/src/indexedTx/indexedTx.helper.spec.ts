import { QueryFailedError } from 'typeorm';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { getTxTTL } from 'src/bridgeTransaction/bridgeTransaction.helper';
import { ChainEnum, TransactionStatusEnum } from 'src/common/enum';
import {
	applyIndexedTx,
	IndexedBridgingTx,
	isPermanentSaveError,
	mapIndexedTxToEntityFields,
} from './indexedTx.helper';

const baseTx = (overrides: Partial<IndexedBridgingTx>): IndexedBridgingTx => ({
	seq: 1,
	originChainId: 'prime',
	txHash: 'abcd',
	destinationChainId: 'vector',
	senderAddr: 'addr_test1sender',
	receivers: [],
	bridgingFee: '0',
	operationFee: '0',
	value: '0',
	blockNumber: 10,
	blockHash: 'bh',
	ttl: 0,
	indexedAt: '2026-10-14T10:00:00Z',
	...overrides,
});

describe('mapIndexedTxToEntityFields', () => {
	it('maps a cardano tx like the frontend did (receivers + fee)', () => {
		const fields = mapIndexedTxToEntityFields(
			baseTx({
				receivers: [
					{ address: 'vector_test1receiver', amount: '5000000', tokenID: 0 },
				],
				bridgingFee: '1000000',
				value: '6000000',
			}),
		);

		expect(fields).toEqual({
			sourceTxHash: 'abcd',
			originChain: ChainEnum.Prime,
			destinationChain: ChainEnum.Vector,
			senderAddress: 'addr_test1sender',
			receiverAddresses: 'vector_test1receiver',
			amount: '6000000',
			amountWei: '6000000000000000000',
			nativeTokenAmount: '0',
			tokenAmountWei: '0',
			tokenID: 0,
			isLayerZero: false,
		});
	});

	it('uses tx value as amount on nexus', () => {
		const fields = mapIndexedTxToEntityFields(
			baseTx({
				originChainId: 'nexus',
				destinationChainId: 'prime',
				receivers: [{ address: 'addr_test1r', amount: '700', tokenID: 0 }],
				bridgingFee: '30',
				value: '730',
			}),
		);

		expect(fields?.amount).toBe('730');
		expect(fields?.amountWei).toBe('730');
	});

	it('restores the 0x prefix of nexus receivers from cardano metadata', () => {
		const fields = mapIndexedTxToEntityFields(
			baseTx({
				destinationChainId: 'nexus',
				receivers: [
					{
						address: '1234567890abcdef1234567890abcdef12345678',
						amount: '1',
						tokenID: 0,
					},
				],
			}),
		);

		expect(fields?.receiverAddresses).toBe(
			'0x1234567890abcdef1234567890abcdef12345678',
		);
	});

	it('removes NUL characters from user controlled addresses', () => {
		const fields = mapIndexedTxToEntityFields(
			baseTx({
				senderAddr: 'addr_test1\u0000sender',
				receivers: [{ address: 'vec\u0000tor', amount: '1', tokenID: 0 }],
			}),
		);

		expect(fields?.senderAddress).toBe('addr_test1sender');
		expect(fields?.receiverAddresses).toBe('vector');
	});

	it('returns undefined for chains reactor does not support', () => {
		expect(
			mapIndexedTxToEntityFields(baseTx({ destinationChainId: 'solana' })),
		).toBeUndefined();
	});
});

describe('isPermanentSaveError', () => {
	const queryError = (code: string) =>
		new QueryFailedError('INSERT', [], { code } as unknown as Error);

	it('treats postgres data exceptions as permanent', () => {
		expect(isPermanentSaveError(queryError('22021'))).toBe(true);
		expect(isPermanentSaveError(queryError('22003'))).toBe(true);
	});

	it('treats other errors as transient', () => {
		expect(isPermanentSaveError(queryError('23505'))).toBe(false);
		expect(isPermanentSaveError(queryError('08006'))).toBe(false);
		expect(isPermanentSaveError(new Error('timeout'))).toBe(false);
	});
});

describe('applyIndexedTx', () => {
	const now = new Date('2026-10-14T12:00:00Z');

	it('creates an active pending tx with ttl', () => {
		const tx = baseTx({
			ttl: 1234,
			receivers: [{ address: 'r', amount: '1', tokenID: 0 }],
		});
		const entity = applyIndexedTx(
			undefined,
			tx,
			mapIndexedTxToEntityFields(tx)!,
			now,
		);

		expect(entity.status).toBe(TransactionStatusEnum.Pending);
		expect(entity.createdAt).toEqual(new Date('2026-10-14T10:00:00Z'));
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
		existing.createdAt = new Date('2026-10-14T09:00:00Z');
		existing.activeFrom = new Date('2026-10-14T13:00:00Z');
		existing.clientID = 'client';

		const tx = baseTx({
			ttl: 1234,
			receivers: [{ address: 'r', amount: '5', tokenID: 0 }],
		});
		const entity = applyIndexedTx(
			existing,
			tx,
			mapIndexedTxToEntityFields(tx)!,
			now,
		);

		expect(entity).toBe(existing);
		expect(entity.amount).toBe('5');
		expect(entity.senderAddress).toBe('addr_test1sender');
		expect(entity.status).toBe(TransactionStatusEnum.SubmittedToBridge);
		expect(entity.destinationTxHash).toBe('dst');
		expect(entity.txRaw).toBe('original');
		expect(entity.createdAt).toEqual(new Date('2026-10-14T09:00:00Z'));
		expect(entity.activeFrom).toEqual(now);
		expect(entity.clientID).toBeNull();
	});
});
