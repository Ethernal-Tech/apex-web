import { SchedulerRegistry } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { LayerZeroNetworkConfig } from 'src/appConfig/appConfig.interface';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { TransactionStatusEnum } from 'src/common/enum';
import { SettingsService } from 'src/settings/settings.service';
import * as scan from './layerZeroScan.helper';
import { LayerZeroSyncService } from './layerZeroSync.service';
import { LayerZeroSyncState } from './layerZeroSyncState.entity';

jest.mock('./layerZeroScan.helper', () => ({
	...jest.requireActual('./layerZeroScan.helper'),
	getLayerZeroOAppMessages: jest.fn(),
	readDecimalConversionRate: jest.fn(),
}));

const getPage = scan.getLayerZeroOAppMessages as jest.MockedFunction<
	typeof scan.getLayerZeroOAppMessages
>;

const network: LayerZeroNetworkConfig = {
	chain: 'nexus',
	oftAddress: '0xoft',
	chainID: 30101,
	txType: 'London',
};

const payload = `0x${'0'.repeat(24)}${'1'.repeat(40)}${'0'.repeat(15)}1`;

const message = (hash: string): scan.LayerZeroMessage => ({
	status: TransactionStatusEnum.SubmittedToBridge,
	pathway: { srcEid: 30101, dstEid: 30184 },
	source: { txHash: hash, from: '0xsender' },
	destination: {},
	payload,
});

/** a listing of pages, each a list of hashes, read through nextToken = page index */
const listing = (pages: string[][]) => {
	getPage.mockImplementation((_eid, _oft, _limit, nextToken) => {
		const index = nextToken ? Number(nextToken) : 0;

		return Promise.resolve({
			messages: pages[index].map(message),
			nextToken: index + 1 < pages.length ? String(index + 1) : undefined,
		});
	});
};

describe('LayerZeroSyncService', () => {
	let stored: Set<string>;
	let state: LayerZeroSyncState | null;
	let service: LayerZeroSyncService;

	beforeEach(() => {
		jest.resetAllMocks();
		stored = new Set();
		state = null;

		const insertBuilder = {
			insert: () => insertBuilder,
			into: () => insertBuilder,
			values: (entity: BridgeTransaction) => {
				insertBuilder.entity = entity;
				return insertBuilder;
			},
			orIgnore: () => insertBuilder,
			execute: () => {
				const hash = insertBuilder.entity!.sourceTxHash;
				const isNew = !stored.has(hash);
				stored.add(hash);
				return Promise.resolve({ raw: isNew ? [{ id: 1 }] : [] });
			},
			entity: undefined as BridgeTransaction | undefined,
		};

		const bridgeTransactionRepository = {
			find: jest.fn(() =>
				Promise.resolve(
					[...stored].map((sourceTxHash) => ({ id: 1, sourceTxHash })),
				),
			),
			createQueryBuilder: () => insertBuilder,
		} as unknown as Repository<BridgeTransaction>;

		const syncStateRepository = {
			findOne: jest.fn(() => Promise.resolve(state)),
			create: jest.fn((data: LayerZeroSyncState) => ({ ...data })),
			save: jest.fn((data: LayerZeroSyncState) => {
				state = { ...data };
				return Promise.resolve(data);
			}),
		} as unknown as Repository<LayerZeroSyncState>;

		service = new LayerZeroSyncService(
			bridgeTransactionRepository,
			syncStateRepository,
			{
				SettingsResponse: {
					directionConfig: {
						nexus: {
							destChain: { base: [{ srcTokenID: 1, dstTokenID: 2 }] },
							tokens: { 1: { chainSpecific: 'lovelace' } },
						},
					},
				},
			} as unknown as SettingsService,
			{} as SchedulerRegistry,
			{
				layerZero: {
					networks: [network, { ...network, chain: 'base', chainID: 30184 }],
				},
				rpc: { evmUrls: [] },
			} as unknown as AppConfigService,
		);
	});

	it('records a short listing in one run and marks the backfill done', async () => {
		listing([['0xa', '0xb'], ['0xc']]);

		await service.syncNetwork(network);

		expect([...stored].sort()).toEqual(['0xa', '0xb', '0xc']);
		expect(state?.backfillDone).toBe(true);
		expect(state?.backfillToken).toBeNull();
	});

	it('reads new transfers from the top and stops at stored ones', async () => {
		listing([['0xa', '0xb'], ['0xc'], ['0xd']]);
		stored = new Set(['0xb', '0xc', '0xd']);
		state = {
			chain: 'nexus',
			oftAddress: '0xoft',
			eid: 30101,
			backfillToken: null,
			backfillDone: true,
			updatedAt: new Date(),
		};

		await service.syncNetwork(network);

		expect(stored.has('0xa')).toBe(true);
		// page 0 had a new transfer, page 1 had none, so page 2 is not read
		expect(getPage).toHaveBeenCalledTimes(2);
	});

	it('continues a long listing through the backfill over several runs', async () => {
		// 10 pages, more than one run reads from the top
		const pages = Array.from({ length: 10 }, (_, i) => [`0x${i}`]);
		listing(pages);

		await service.syncNetwork(network);

		// 5 pages from the top and 2 backfill pages
		expect(stored.size).toBe(7);
		expect(state?.backfillDone).toBe(false);

		await service.syncNetwork(network);

		// the top is caught up, the backfill reads the rest
		expect(stored.size).toBe(9);

		await service.syncNetwork(network);

		expect(stored.size).toBe(10);
		expect(state?.backfillDone).toBe(true);
	});

	it('never reads the listing on a testnet instance', async () => {
		listing([['0xa']]);

		const testnetService = new LayerZeroSyncService(
			{} as Repository<BridgeTransaction>,
			{} as Repository<LayerZeroSyncState>,
			{ SettingsResponse: {} } as unknown as SettingsService,
			{} as SchedulerRegistry,
			{
				app: { isMainnet: false },
				features: { statusUpdateModesSupported: ['layerzero'] },
				layerZero: { networks: [network] },
			} as unknown as AppConfigService,
		);

		await testnetService.syncLayerZero();

		expect(getPage).not.toHaveBeenCalled();
	});

	it('keeps the backfill cursor when the scan API is not reachable', async () => {
		state = {
			chain: 'nexus',
			oftAddress: '0xoft',
			eid: 30101,
			backfillToken: '3',
			backfillDone: false,
			updatedAt: new Date(),
		};
		getPage.mockResolvedValue(undefined);

		await service.syncNetwork(network);

		expect(state?.backfillToken).toBe('3');
		expect(state?.backfillDone).toBe(false);
	});
});
