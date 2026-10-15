import { QueryFailedError, Repository } from 'typeorm';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { IndexedTxService } from './indexedTx.service';
import { IndexedBridgingTx } from './indexedTx.helper';
import { IndexerCursor } from './indexerCursor.entity';

const tx = (seq: number, txHash: string): IndexedBridgingTx => ({
	seq,
	originChainId: 'prime',
	txHash,
	destinationChainId: 'vector',
	senderAddr: 'addr_test1sender',
	receivers: [{ address: 'vector_test1receiver', amount: '100', tokenID: 0 }],
	bridgingFee: '1',
	operationFee: '0',
	value: '101',
	blockNumber: 1,
	blockHash: 'bh',
	ttl: 10,
	indexedAt: '2026-10-14T10:00:00Z',
});

const queryError = (code: string) =>
	new QueryFailedError('INSERT', [], { code } as unknown as Error);

describe('IndexedTxService.saveTxs', () => {
	let save: jest.Mock;
	let service: IndexedTxService;

	beforeEach(() => {
		save = jest.fn((entity: BridgeTransaction) => Promise.resolve(entity));

		const bridgeTransactionRepository = {
			find: jest.fn(() => Promise.resolve([])),
			save,
		} as unknown as Repository<BridgeTransaction>;

		service = new IndexedTxService(
			bridgeTransactionRepository,
			{} as Repository<IndexerCursor>,
			{} as SchedulerRegistry,
			{} as AppConfigService,
		);
	});

	it('saves all txs and returns the last sequence', async () => {
		expect(await service.saveTxs([tx(1, 'a'), tx(2, 'b')])).toBe(2);
		expect(save).toHaveBeenCalledTimes(2);
	});

	it('skips a tx postgres can never store and continues with the next one', async () => {
		save.mockRejectedValueOnce(queryError('22021'));

		expect(await service.saveTxs([tx(1, 'poison'), tx(2, 'b')])).toBe(2);
		expect(save).toHaveBeenCalledTimes(2);
	});

	it('stops at a transient failure without moving past the tx', async () => {
		save.mockRejectedValueOnce(queryError('23505'));

		// the first tx failed, so nothing after it is processed and the cursor stays
		expect(
			await service.saveTxs([tx(1, 'conflict'), tx(2, 'b'), tx(3, 'c')]),
		).toBeUndefined();
		expect(save).toHaveBeenCalledTimes(1);
	});

	it('skips a tx that keeps failing for an unknown reason', async () => {
		save.mockImplementation((entity: BridgeTransaction) =>
			entity.sourceTxHash === 'stuck'
				? Promise.reject(new Error('unknown'))
				: Promise.resolve(entity),
		);

		const txs = [tx(1, 'stuck'), tx(2, 'b')];

		for (let i = 0; i < 9; i++) {
			expect(await service.saveTxs(txs)).toBeUndefined();
		}

		expect(await service.saveTxs(txs)).toBe(2);
	});

	it('skips a tx whose data can not be mapped', async () => {
		const malformed = tx(1, 'malformed');
		malformed.receivers = [
			{ address: 'r', amount: 'not-a-number', tokenID: 0 },
		];

		expect(await service.saveTxs([malformed, tx(2, 'b')])).toBe(2);
		expect(save).toHaveBeenCalledTimes(1);
	});
});
