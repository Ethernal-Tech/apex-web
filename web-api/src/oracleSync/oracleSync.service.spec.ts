import { AppConfigService } from 'src/appConfig/appConfig.service';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { JobLockService } from 'src/jobLock/jobLock.service';
import { SettingsService } from 'src/settings/settings.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import {
	BridgingModeEnum,
	ChainApexBridgeEnum,
	TransactionStatusEnum,
} from 'src/common/enum';
import * as helper from './oracleSync.helper';
import { OracleBridgingRequestState } from './oracleSync.helper';
import { OracleSyncService } from './oracleSync.service';
import { OracleSyncState } from './oracleSyncState.entity';

jest.mock('./oracleSync.helper', () => ({
	getBridgingRequestStatePage: jest.fn(),
}));

const getPageMock = helper.getBridgingRequestStatePage as jest.Mock;

const INSTANCE_ID = 'instance-1';

const state = (
	overrides: Partial<OracleBridgingRequestState> = {},
): OracleBridgingRequestState => ({
	sourceChainId: ChainApexBridgeEnum.Prime,
	sourceTxHash: 'hash1',
	destinationChainId: ChainApexBridgeEnum.Nexus,
	status: TransactionStatusEnum.ExecutedOnDestination,
	destinationTxHash: 'dstHash1',
	isRefund: false,
	createdAt: '2026-09-01T10:00:00Z',
	details: {
		senderAddr: 'addr_sender',
		receivers: [
			{ address: 'receiver1', amount: '2000000000000000000', tokenId: 1 },
			{ address: 'receiver2', amount: '7000000000000000000', tokenId: 2 },
		],
		amount: '2000000000000000000',
		tokenAmount: '7000000000000000000',
		tokenId: 2,
		bridgingFee: '1000000000000000000',
		operationFee: '0',
	},
	...overrides,
});

describe('OracleSyncService', () => {
	let service: OracleSyncService;
	let bridgeTransactionRepository: Repository<BridgeTransaction>;
	let oracleSyncStateRepository: Repository<OracleSyncState>;

	let insertedValues: BridgeTransaction[];
	let savedStates: OracleSyncState[];
	let updateMock: jest.SpyInstance;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				OracleSyncService,
				{
					provide: getRepositoryToken(BridgeTransaction),
					useClass: Repository,
				},
				{ provide: getRepositoryToken(OracleSyncState), useClass: Repository },
				{ provide: JobLockService, useValue: { runExclusive: jest.fn() } },
				{
					provide: AppConfigService,
					useValue: {
						features: {
							statusUpdateModesSupported: [BridgingModeEnum.Skyline],
						},
					},
				},
				{
					provide: SettingsService,
					useValue: {
						SettingsResponse: {
							directionConfig: {
								[ChainApexBridgeEnum.Prime]: {
									tokens: {
										1: { chainSpecific: 'lovelace' },
										2: { chainSpecific: 'wrapped', isWrappedCurrency: true },
									},
								},
							},
							settingsPerMode: {
								[BridgingModeEnum.Skyline]: {
									bridgingSettings: { minValueToBridge: 5 },
								},
							},
						},
					},
				},
			],
		}).compile();

		service = module.get<OracleSyncService>(OracleSyncService);
		bridgeTransactionRepository = module.get(
			getRepositoryToken(BridgeTransaction),
		);
		oracleSyncStateRepository = module.get(getRepositoryToken(OracleSyncState));

		insertedValues = [];
		savedStates = [];

		jest.spyOn(bridgeTransactionRepository, 'find').mockResolvedValue([]);
		updateMock = jest
			.spyOn(bridgeTransactionRepository, 'update')
			.mockResolvedValue({} as UpdateResult);
		jest
			.spyOn(bridgeTransactionRepository, 'createQueryBuilder')
			.mockReturnValue({
				insert: () => ({
					into: () => ({
						values: (values: BridgeTransaction[]) => {
							insertedValues.push(...values);

							return { orIgnore: () => ({ execute: jest.fn() }) };
						},
					}),
				}),
			} as never);

		jest.spyOn(oracleSyncStateRepository, 'findOne').mockResolvedValue(null);
		jest
			.spyOn(oracleSyncStateRepository, 'create')
			.mockImplementation((value) => value as OracleSyncState);
		jest
			.spyOn(oracleSyncStateRepository, 'save')
			.mockImplementation((value) => {
				savedStates.push({ ...value } as OracleSyncState);

				return Promise.resolve(value as OracleSyncState);
			});

		getPageMock.mockReset();
	});

	const runSync = () =>
		(
			service as unknown as { syncMode: (m: BridgingModeEnum) => Promise<void> }
		).syncMode(BridgingModeEnum.Skyline);

	it('imports a state with details and advances the cursor', async () => {
		getPageMock.mockResolvedValueOnce({
			instanceId: INSTANCE_ID,
			nextFrom: 2,
			hasMore: false,
			items: [state()],
		});

		await runSync();

		expect(insertedValues).toHaveLength(1);

		const entity = insertedValues[0];
		expect(entity.sourceTxHash).toBe('hash1');
		expect(entity.originChain).toBe(ChainApexBridgeEnum.Prime);
		expect(entity.destinationChain).toBe(ChainApexBridgeEnum.Nexus);
		expect(entity.senderAddress).toBe('addr_sender');
		expect(entity.receiverAddresses).toBe('receiver1, receiver2');
		expect(entity.isOracleDiscovered).toBe(true);
		// currency 2 + bridgingFee 1 + operationFee 0, the fees count as bridged currency
		expect(entity.amountWei).toBe('3000000000000000000');
		// prime is a cardano chain, so the amount column holds lovelace
		expect(entity.amount).toBe('3000000');
		expect(entity.nativeTokenAmount).toBe('7000000');
		expect(entity.tokenID).toBe(2);
		expect(entity.finishedAt).toBeDefined();

		expect(savedStates[savedStates.length - 1]).toMatchObject({
			syncIndex: '2',
			instanceId: INSTANCE_ID,
		});
	});

	it('stands in the minimum bridged amount when a state has no details', async () => {
		getPageMock.mockResolvedValueOnce({
			instanceId: INSTANCE_ID,
			nextFrom: 2,
			hasMore: false,
			items: [state({ details: null, createdAt: '0001-01-01T00:00:00Z' })],
		});

		await runSync();

		expect(insertedValues).toHaveLength(1);

		const entity = insertedValues[0];
		// minValueToBridge is 5 DFM, which is 5 lovelace on prime and 5e12 wei
		expect(entity.amountWei).toBe('5000000000000');
		expect(entity.amount).toBe('5');
		expect(entity.nativeTokenAmount).toBe('0');
		expect(entity.tokenID).toBe(0);
		expect(entity.senderAddress).toBe('');
		expect(entity.createdAt).toEqual(new Date(0));
	});

	it('reports currency only transfers with token id zero', async () => {
		const currencyOnly = state();
		currencyOnly.details = {
			...currencyOnly.details!,
			tokenAmount: '0',
			tokenId: 1,
		};

		getPageMock.mockResolvedValueOnce({
			instanceId: INSTANCE_ID,
			nextFrom: 2,
			hasMore: false,
			items: [currencyOnly],
		});

		await runSync();

		expect(insertedValues[0].tokenID).toBe(0);
	});

	// bridging a token sends no currency to the receivers, the currency the sender parted with is
	// the fees, so the amount column must not come out as zero
	it('reports the fees as the currency amount for a token only bridge', async () => {
		const tokenOnly = state();
		tokenOnly.details = {
			...tokenOnly.details!,
			receivers: [
				{ address: 'receiver1', amount: '7000000000000000000', tokenId: 2 },
			],
			amount: '0',
			bridgingFee: '1000000000000000000',
			operationFee: '500000000000000000',
		};

		getPageMock.mockResolvedValueOnce({
			instanceId: INSTANCE_ID,
			nextFrom: 2,
			hasMore: false,
			items: [tokenOnly],
		});

		await runSync();

		const entity = insertedValues[0];
		expect(entity.amountWei).toBe('1500000000000000000');
		expect(entity.amount).toBe('1500000');
		expect(entity.nativeTokenAmount).toBe('7000000');
		expect(entity.tokenID).toBe(2);
	});

	it('skips states this API already has', async () => {
		jest
			.spyOn(bridgeTransactionRepository, 'find')
			.mockResolvedValue([{ sourceTxHash: 'hash1' } as BridgeTransaction]);

		getPageMock.mockResolvedValueOnce({
			instanceId: INSTANCE_ID,
			nextFrom: 2,
			hasMore: false,
			items: [state()],
		});

		await runSync();

		expect(insertedValues).toHaveLength(0);
		// the cursor still advances, the state is accounted for
		expect(savedStates[savedStates.length - 1]).toMatchObject({
			syncIndex: '2',
		});
	});

	it('stores evm hashes 0x prefixed the way this API already does', async () => {
		getPageMock.mockResolvedValueOnce({
			instanceId: INSTANCE_ID,
			nextFrom: 2,
			hasMore: false,
			items: [
				state({
					sourceChainId: ChainApexBridgeEnum.Nexus,
					destinationChainId: ChainApexBridgeEnum.Prime,
					sourceTxHash: 'abc123',
				}),
			],
		});

		await runSync();

		expect(insertedValues[0].sourceTxHash).toBe('0xabc123');
	});

	it('does not re-import an evm tx this API stored with a 0x prefix', async () => {
		jest
			.spyOn(bridgeTransactionRepository, 'find')
			.mockResolvedValue([{ sourceTxHash: '0xabc123' } as BridgeTransaction]);

		getPageMock.mockResolvedValueOnce({
			instanceId: INSTANCE_ID,
			nextFrom: 2,
			hasMore: false,
			items: [
				state({
					sourceChainId: ChainApexBridgeEnum.Nexus,
					destinationChainId: ChainApexBridgeEnum.Prime,
					sourceTxHash: 'abc123',
				}),
			],
		});

		await runSync();

		expect(insertedValues).toHaveLength(0);
	});

	it('leaves cardano hashes unprefixed', async () => {
		getPageMock.mockResolvedValueOnce({
			instanceId: INSTANCE_ID,
			nextFrom: 2,
			hasMore: false,
			items: [state({ sourceTxHash: 'abc123' })],
		});

		await runSync();

		expect(insertedValues[0].sourceTxHash).toBe('abc123');
	});

	it('skips states on chains this API does not know', async () => {
		getPageMock.mockResolvedValueOnce({
			instanceId: INSTANCE_ID,
			nextFrom: 2,
			hasMore: false,
			items: [state({ destinationChainId: 'notachain' })],
		});

		await runSync();

		expect(insertedValues).toHaveLength(0);
	});

	it('keeps the cursor when the oracle cannot be reached', async () => {
		jest.spyOn(oracleSyncStateRepository, 'findOne').mockResolvedValue({
			bridgingMode: BridgingModeEnum.Skyline,
			syncIndex: '42',
			instanceId: INSTANCE_ID,
		} as OracleSyncState);

		getPageMock.mockResolvedValueOnce(null);

		await runSync();

		expect(savedStates).toHaveLength(0);
		expect(getPageMock).toHaveBeenCalledWith(
			BridgingModeEnum.Skyline,
			'42',
			500,
		);
	});

	it('restarts the sweep when the oracle database was recreated', async () => {
		jest.spyOn(oracleSyncStateRepository, 'findOne').mockResolvedValue({
			bridgingMode: BridgingModeEnum.Skyline,
			syncIndex: '42',
			instanceId: 'an-older-instance',
		} as OracleSyncState);

		getPageMock
			.mockResolvedValueOnce({
				instanceId: INSTANCE_ID,
				nextFrom: 43,
				hasMore: true,
				items: [state()],
			})
			.mockResolvedValueOnce({
				instanceId: INSTANCE_ID,
				nextFrom: 2,
				hasMore: false,
				items: [state()],
			});

		await runSync();

		// the page fetched under the stale cursor is discarded, the next one starts at zero
		expect(getPageMock).toHaveBeenNthCalledWith(
			2,
			BridgingModeEnum.Skyline,
			'0',
			500,
		);
		expect(insertedValues).toHaveLength(1);
	});

	it('follows hasMore across pages', async () => {
		getPageMock
			.mockResolvedValueOnce({
				instanceId: INSTANCE_ID,
				nextFrom: 2,
				hasMore: true,
				items: [state()],
			})
			.mockResolvedValueOnce({
				instanceId: INSTANCE_ID,
				nextFrom: 3,
				hasMore: false,
				items: [state({ sourceTxHash: 'hash2' })],
			});

		await runSync();

		expect(getPageMock).toHaveBeenCalledTimes(2);
		expect(insertedValues.map((e) => e.sourceTxHash)).toEqual([
			'hash1',
			'hash2',
		]);
	});
	it('puts a finalized transaction back to the state the oracle still has it in', async () => {
		jest.spyOn(bridgeTransactionRepository, 'find').mockResolvedValue([
			{
				id: 7,
				sourceTxHash: 'hash1',
				status: TransactionStatusEnum.ExecutedOnDestination,
			} as BridgeTransaction,
		]);

		getPageMock.mockResolvedValueOnce({
			instanceId: INSTANCE_ID,
			nextFrom: 2,
			hasMore: false,
			items: [
				state({
					status: TransactionStatusEnum.FailedToExecuteOnDestination,
					destinationTxHash: undefined,
					isRefund: true,
				}),
			],
		});

		await runSync();

		expect(insertedValues).toHaveLength(0);
		expect(updateMock).toHaveBeenCalledTimes(1);

		const [id, values] = updateMock.mock.calls[0] as [
			number,
			Record<string, unknown>,
		];
		expect(id).toBe(7);
		expect(values.status).toBe(
			TransactionStatusEnum.FailedToExecuteOnDestination,
		);
		expect(values.isRefund).toBe(true);
		// a transaction that is back in flight carries neither of these
		expect((values.finishedAt as () => string)()).toBe('NULL');
		expect((values.destinationTxHash as () => string)()).toBe('NULL');
	});

	it('leaves a finalized transaction alone when the oracle agrees it is done', async () => {
		jest.spyOn(bridgeTransactionRepository, 'find').mockResolvedValue([
			{
				id: 7,
				sourceTxHash: 'hash1',
				status: TransactionStatusEnum.ExecutedOnDestination,
			} as BridgeTransaction,
		]);

		getPageMock.mockResolvedValueOnce({
			instanceId: INSTANCE_ID,
			nextFrom: 2,
			hasMore: false,
			items: [state({ status: TransactionStatusEnum.ExecutedOnDestination })],
		});

		await runSync();

		expect(updateMock).not.toHaveBeenCalled();
	});

	it('leaves a transaction this API has not finalized to the status job', async () => {
		jest.spyOn(bridgeTransactionRepository, 'find').mockResolvedValue([
			{
				id: 7,
				sourceTxHash: 'hash1',
				status: TransactionStatusEnum.SubmittedToBridge,
			} as BridgeTransaction,
		]);

		getPageMock.mockResolvedValueOnce({
			instanceId: INSTANCE_ID,
			nextFrom: 2,
			hasMore: false,
			items: [state({ status: TransactionStatusEnum.DiscoveredOnSource })],
		});

		await runSync();

		expect(updateMock).not.toHaveBeenCalled();
	});
});
