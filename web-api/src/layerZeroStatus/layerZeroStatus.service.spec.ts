import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LayerZeroNetworkConfig } from 'src/appConfig/appConfig.interface';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { ChainEnum, TransactionStatusEnum } from 'src/common/enum';
import { JobLockService } from 'src/jobLock/jobLock.service';
import { SettingsService } from 'src/settings/settings.service';
import { Repository } from 'typeorm';
import { EmptyRpcResultError } from 'src/utils/evmRpc';
import * as scanHelper from './layerZeroScan.helper';
import { LayerZeroMessage } from './layerZeroScan.helper';
import { LayerZeroStatusService } from './layerZeroStatus.service';
import { LayerZeroSyncState } from './layerZeroSyncState.entity';
import * as oftHelper from './oft.helper';

jest.mock('./layerZeroScan.helper', () => ({
	...jest.requireActual('./layerZeroScan.helper'),
	getLayerZeroOAppMessages: jest.fn(),
}));

jest.mock('./oft.helper', () => ({
	...jest.requireActual('./oft.helper'),
	readDecimalConversionRate: jest.fn(),
}));

const getMessagesMock = scanHelper.getLayerZeroOAppMessages as jest.Mock;
const readRateMock = oftHelper.readDecimalConversionRate as jest.Mock;

const NEXUS_EID = 30384;
const BASE_EID = 30184;
const OFT_ADDRESS = '0x9208d82f121806a34a39bb90733b4c5c54f3993e';
const APEX_ID = 1;
const BAPEX_ID = 1000002;
/** 10^12, the OFT's local over shared decimals. */
const RATE = BigInt('1000000000000');

const BASE_NETWORK: LayerZeroNetworkConfig = {
	chain: ChainEnum.Base,
	oftAddress: OFT_ADDRESS as `0x${string}`,
	chainID: BASE_EID,
	txType: 'London',
};

const NEXUS_NETWORK: LayerZeroNetworkConfig = {
	chain: ChainEnum.Nexus,
	oftAddress: OFT_ADDRESS as `0x${string}`,
	chainID: NEXUS_EID,
	txType: 'London',
};

const RECEIVER = '0xa25b3d7d9c689178b3de2450a3d263af31b32fbd';
/** The receiver word followed by 60644548595 in shared decimals. */
const PAYLOAD = `0x000000000000000000000000${RECEIVER.slice(2)}0000000e1eb25ff3`;

const message = (
	overrides: Partial<LayerZeroMessage> = {},
): LayerZeroMessage => ({
	status: TransactionStatusEnum.ExecutedOnDestination,
	pathway: { srcEid: BASE_EID, dstEid: NEXUS_EID },
	source: {
		txHash: '0xsourcehash',
		from: '0x981e90c78ccdb321f06294362a70794914640c08',
		sentAt: new Date('2026-09-04T11:51:49Z'),
	},
	destination: {
		txHash: '0xdestinationhash',
		deliveredAt: new Date('2026-09-04T11:53:30Z'),
	},
	payload: PAYLOAD,
	...overrides,
});

/** A message per hash, so a page looks like one of real traffic. */
const page = (hashes: string[], nextToken?: string) => ({
	messages: hashes.map((hash) =>
		message({ source: { ...message().source, txHash: hash } }),
	),
	nextToken,
});

describe('LayerZeroStatusService', () => {
	let service: LayerZeroStatusService;
	let bridgeTransactionRepository: Repository<BridgeTransaction>;
	let layerZeroSyncStateRepository: Repository<LayerZeroSyncState>;

	let insertedValues: BridgeTransaction[];
	let savedStates: LayerZeroSyncState[];

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				LayerZeroStatusService,
				{
					provide: getRepositoryToken(BridgeTransaction),
					useClass: Repository,
				},
				{
					provide: getRepositoryToken(LayerZeroSyncState),
					useClass: Repository,
				},
				{ provide: JobLockService, useValue: { runExclusive: jest.fn() } },
				{
					provide: AppConfigService,
					useValue: {
						features: { statusUpdateModesSupported: ['layerzero'] },
						layerZero: { networks: [BASE_NETWORK, NEXUS_NETWORK] },
						rpc: {
							evmUrls: [
								{ chain: ChainEnum.Base, value: 'https://base.rpc' },
								{ chain: ChainEnum.Nexus, value: 'https://nexus.rpc' },
							],
						},
					},
				},
				{
					provide: SettingsService,
					useValue: {
						SettingsResponse: {
							directionConfig: {
								[ChainEnum.Base]: {
									destChain: {
										[ChainEnum.Nexus]: [
											{ srcTokenID: BAPEX_ID, dstTokenID: APEX_ID },
										],
									},
									tokens: {
										1000001: { chainSpecific: 'lovelace' },
										[BAPEX_ID]: { chainSpecific: OFT_ADDRESS },
									},
								},
								[ChainEnum.Nexus]: {
									destChain: {
										[ChainEnum.Base]: [
											{ srcTokenID: APEX_ID, dstTokenID: BAPEX_ID },
										],
									},
									tokens: { [APEX_ID]: { chainSpecific: 'lovelace' } },
								},
							},
						},
					},
				},
			],
		}).compile();

		service = module.get<LayerZeroStatusService>(LayerZeroStatusService);
		bridgeTransactionRepository = module.get(
			getRepositoryToken(BridgeTransaction),
		);
		layerZeroSyncStateRepository = module.get(
			getRepositoryToken(LayerZeroSyncState),
		);

		insertedValues = [];
		savedStates = [];

		jest.spyOn(bridgeTransactionRepository, 'find').mockResolvedValue([]);
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

		jest.spyOn(layerZeroSyncStateRepository, 'findOne').mockResolvedValue(null);
		jest
			.spyOn(layerZeroSyncStateRepository, 'create')
			.mockImplementation((value) => value as LayerZeroSyncState);
		jest
			.spyOn(layerZeroSyncStateRepository, 'save')
			.mockImplementation((value) => {
				savedStates.push({ ...value } as LayerZeroSyncState);

				return Promise.resolve(value as LayerZeroSyncState);
			});

		getMessagesMock.mockReset();
		readRateMock.mockReset();

		readRateMock.mockResolvedValue(RATE);
		// the spy outlives the test that installed it, jest is not clearing mocks
		jest
			.spyOn(Logger, 'warn')
			.mockImplementation(() => undefined)
			.mockClear();
		jest
			.spyOn(Logger, 'error')
			.mockImplementation(() => undefined)
			.mockClear();
		getMessagesMock.mockResolvedValue(page([]));
	});

	const runSync = (
		network: LayerZeroNetworkConfig = BASE_NETWORK,
		rates = new Map([
			[ChainEnum.Base as string, RATE],
			[ChainEnum.Nexus as string, RATE],
		]),
	) =>
		(
			service as unknown as {
				syncNetwork: (
					n: LayerZeroNetworkConfig,
					r: Map<string, bigint>,
				) => Promise<void>;
			}
		).syncNetwork(network, rates);

	const readRates = (networks = [BASE_NETWORK, NEXUS_NETWORK]) =>
		(
			service as unknown as {
				readConversionRates: (
					n: LayerZeroNetworkConfig[],
				) => Promise<Map<string, bigint>>;
			}
		).readConversionRates(networks);

	const lastState = () => savedStates[savedStates.length - 1];

	it('imports a transfer with what the listing knows about it', async () => {
		getMessagesMock.mockResolvedValueOnce(page(['0xsourcehash']));

		await runSync();

		expect(insertedValues).toHaveLength(1);
		expect(insertedValues[0]).toMatchObject({
			sourceTxHash: '0xsourcehash',
			originChain: ChainEnum.Base,
			destinationChain: ChainEnum.Nexus,
			status: TransactionStatusEnum.ExecutedOnDestination,
			destinationTxHash: '0xdestinationhash',
			senderAddress: '0x981e90c78ccdb321f06294362a70794914640c08',
			receiverAddresses: RECEIVER,
			createdAt: new Date('2026-09-04T11:51:49Z'),
			finishedAt: new Date('2026-09-04T11:53:30Z'),
			isLayerZero: true,
			isOracleDiscovered: true,
			clientID: null,
			activeFrom: undefined,
		});
	});

	it('scales the amount by the decimal conversion rate of the oft', async () => {
		getMessagesMock.mockResolvedValueOnce(page(['0xsourcehash']));

		await runSync();

		// 60644548595 shared decimals over the 10^12 rate
		expect(insertedValues[0]).toMatchObject({
			tokenID: BAPEX_ID,
			tokenAmountWei: '60644548595000000000000',
			nativeTokenAmount: '60644548595000000000000',
			amountWei: '0',
			amount: '0',
		});
	});

	it('reports a transfer of the origin chain currency with token id zero', async () => {
		getMessagesMock.mockResolvedValueOnce({
			messages: [message({ pathway: { srcEid: NEXUS_EID, dstEid: BASE_EID } })],
		});

		await runSync(NEXUS_NETWORK);

		expect(insertedValues[0]).toMatchObject({
			originChain: ChainEnum.Nexus,
			destinationChain: ChainEnum.Base,
			tokenID: 0,
			amountWei: '60644548595000000000000',
			amount: '60644548595000000000000',
			tokenAmountWei: '0',
			nativeTokenAmount: '0',
		});
	});

	it('takes the chains from the message, not from the listing it was read on', async () => {
		// the listing of an endpoint carries what arrives on it as well
		getMessagesMock.mockResolvedValueOnce({
			messages: [message({ pathway: { srcEid: NEXUS_EID, dstEid: BASE_EID } })],
		});

		await runSync(BASE_NETWORK);

		expect(insertedValues[0]).toMatchObject({
			originChain: ChainEnum.Nexus,
			destinationChain: ChainEnum.Base,
		});
	});

	it('skips transfers this API already has', async () => {
		getMessagesMock.mockResolvedValueOnce(page(['0xsourcehash']));
		jest
			.spyOn(bridgeTransactionRepository, 'find')
			.mockResolvedValue([
				{ id: 1, sourceTxHash: '0xsourcehash' } as BridgeTransaction,
			]);

		await runSync();

		expect(insertedValues).toHaveLength(0);
	});

	it('does not re-import a transfer this API stored without the 0x prefix', async () => {
		getMessagesMock.mockResolvedValueOnce(page(['0xsourcehash']));
		jest
			.spyOn(bridgeTransactionRepository, 'find')
			.mockResolvedValue([
				{ id: 1, sourceTxHash: 'sourcehash' } as BridgeTransaction,
			]);

		await runSync();

		expect(insertedValues).toHaveLength(0);
	});

	it('skips messages between endpoints that are not both configured', async () => {
		getMessagesMock.mockResolvedValueOnce({
			messages: [message({ pathway: { srcEid: BASE_EID, dstEid: 30101 } })],
		});

		await runSync();

		expect(insertedValues).toHaveLength(0);
	});

	it('skips messages whose body is not an oft transfer', async () => {
		getMessagesMock.mockResolvedValueOnce({
			messages: [message({ payload: '0xdeadbeef' })],
		});

		await runSync();

		expect(insertedValues).toHaveLength(0);
	});

	it('scales by the rate of the chain a transfer left, not of the listing', async () => {
		// the base listing carries what arrives on base as well, and those left nexus
		getMessagesMock.mockResolvedValueOnce({
			messages: [message({ pathway: { srcEid: NEXUS_EID, dstEid: BASE_EID } })],
		});

		await runSync(
			BASE_NETWORK,
			new Map([
				[ChainEnum.Base as string, BigInt(1)],
				[ChainEnum.Nexus as string, RATE],
			]),
		);

		expect(insertedValues[0]).toMatchObject({
			amountWei: '60644548595000000000000',
		});
	});

	it('reads a rate once per chain and keeps it for the runs after', async () => {
		await readRates();
		await readRates();

		expect(readRateMock).toHaveBeenCalledTimes(2);
		expect(readRateMock).toHaveBeenCalledWith('https://base.rpc', OFT_ADDRESS);
		expect(readRateMock).toHaveBeenCalledWith('https://nexus.rpc', OFT_ADDRESS);
	});

	it('stands in the default rate when the oft cannot be read', async () => {
		const warn = jest.spyOn(Logger, 'warn');
		const error = jest.spyOn(Logger, 'error');
		readRateMock.mockRejectedValue(
			new EmptyRpcResultError('eth_call returned no data (0x)'),
		);

		const rates = await readRates([NEXUS_NETWORK]);

		expect(rates.get(ChainEnum.Nexus)).toBe(BigInt('1000000000000'));
		// a node on another network than the contracts is a warning, not an error
		expect(warn).toHaveBeenCalledTimes(1);
		expect(error).not.toHaveBeenCalled();
	});

	it('does not ask a node again that answered there is no such contract', async () => {
		readRateMock.mockRejectedValue(
			new EmptyRpcResultError('eth_call returned no data (0x)'),
		);

		await readRates([NEXUS_NETWORK]);
		await readRates([NEXUS_NETWORK]);
		await readRates([NEXUS_NETWORK]);

		expect(readRateMock).toHaveBeenCalledTimes(1);
	});

	it('asks a node that could not be reached again next run', async () => {
		readRateMock.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));

		const first = await readRates([NEXUS_NETWORK]);

		expect(first.get(ChainEnum.Nexus)).toBe(BigInt('1000000000000'));

		readRateMock.mockResolvedValue(BigInt(10));

		const second = await readRates([NEXUS_NETWORK]);

		expect(second.get(ChainEnum.Nexus)).toBe(BigInt(10));
	});

	it('stands in the default rate for a chain with no rpc url, without asking', async () => {
		const rates = await readRates([
			{ ...NEXUS_NETWORK, chain: 'unwired' as ChainEnum },
		]);

		expect(rates.get('unwired')).toBe(BigInt('1000000000000'));
		expect(readRateMock).not.toHaveBeenCalled();
	});

	it('picks up a transfer that appeared at the top of a listing it had caught up with', async () => {
		jest.spyOn(layerZeroSyncStateRepository, 'findOne').mockResolvedValue({
			chain: ChainEnum.Base,
			oftAddress: OFT_ADDRESS,
			eid: BASE_EID,
			backfillToken: null,
			backfillDone: true,
		} as LayerZeroSyncState);

		// the newest transfer heads the page, the rest of it this API has
		getMessagesMock
			.mockResolvedValueOnce(page(['0xbrandnew', '0xstored'], 'token1'))
			.mockResolvedValueOnce(page(['0xstored'], 'token2'));
		jest
			.spyOn(bridgeTransactionRepository, 'find')
			.mockResolvedValue([
				{ id: 1, sourceTxHash: '0xstored' } as BridgeTransaction,
			]);

		await runSync();

		expect(insertedValues.map((tx) => tx.sourceTxHash)).toEqual(['0xbrandnew']);
	});

	it('goes back for the transfers below where a run of new ones ran out of budget', async () => {
		// a listing this API had read to the bottom, then a burst longer than one
		// run's worth of pages arrives on top of it
		jest.spyOn(layerZeroSyncStateRepository, 'findOne').mockResolvedValue({
			chain: ChainEnum.Base,
			oftAddress: OFT_ADDRESS,
			eid: BASE_EID,
			backfillToken: null,
			backfillDone: true,
		} as LayerZeroSyncState);
		getMessagesMock.mockImplementation((_eid, _oft, _limit, token) =>
			Promise.resolve(page([`0x${token ?? 'first'}`], `token${token ?? 0}`)),
		);

		await runSync();

		// where it gave up is kept, rather than the listing counting as read
		expect(lastState()).toMatchObject({ backfillDone: false });
		expect(lastState().backfillToken).toBeTruthy();
	});

	it('stops reading down the listing at the first page with nothing new', async () => {
		getMessagesMock
			.mockResolvedValueOnce(page(['0xnew1'], 'token1'))
			.mockResolvedValueOnce(page(['0xstored'], 'token2'));
		jest
			.spyOn(bridgeTransactionRepository, 'find')
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([
				{ id: 1, sourceTxHash: '0xstored' } as BridgeTransaction,
			]);

		await runSync();

		expect(getMessagesMock).toHaveBeenCalledTimes(2);
		expect(insertedValues.map((tx) => tx.sourceTxHash)).toEqual(['0xnew1']);
	});

	it('asks for pages of fifty, newest first', async () => {
		await runSync();

		expect(getMessagesMock).toHaveBeenCalledWith(
			BASE_EID,
			OFT_ADDRESS,
			50,
			undefined,
		);
	});

	it('marks the backfill done when the listing runs out', async () => {
		getMessagesMock.mockResolvedValueOnce(page(['0xnew1']));

		await runSync();

		expect(lastState()).toMatchObject({
			backfillDone: true,
			backfillToken: null,
		});
	});

	it('keeps the page it got to when the listing goes on past one run', async () => {
		// every page brings something new, so the walk from the top runs out of budget
		getMessagesMock.mockImplementation((_eid, _oft, _limit, token) =>
			Promise.resolve(page([`0x${token ?? 'first'}`], `token${token ?? 0}`)),
		);

		await runSync();

		// as many pages as one run is allowed, and then a cursor to carry on from
		expect(getMessagesMock.mock.calls.length).toBeGreaterThan(1);
		expect(lastState()).toMatchObject({ backfillDone: false });
		expect(lastState().backfillToken).toBeTruthy();
	});

	it('carries the backfill on from where it stopped', async () => {
		jest.spyOn(layerZeroSyncStateRepository, 'findOne').mockResolvedValue({
			chain: ChainEnum.Base,
			oftAddress: OFT_ADDRESS,
			eid: BASE_EID,
			backfillToken: 'deeptoken',
			backfillDone: false,
		} as LayerZeroSyncState);

		// the top of the listing is all known, then the backfill resumes below
		getMessagesMock
			.mockResolvedValueOnce(page([], 'token1'))
			.mockResolvedValueOnce(page(['0xold'], undefined));

		await runSync();

		expect(getMessagesMock).toHaveBeenNthCalledWith(
			2,
			BASE_EID,
			OFT_ADDRESS,
			50,
			'deeptoken',
		);
		expect(insertedValues.map((tx) => tx.sourceTxHash)).toEqual(['0xold']);
		expect(lastState()).toMatchObject({
			backfillDone: true,
			backfillToken: null,
		});
	});

	it('reads only the top of the listing once the backfill is done', async () => {
		jest.spyOn(layerZeroSyncStateRepository, 'findOne').mockResolvedValue({
			chain: ChainEnum.Base,
			oftAddress: OFT_ADDRESS,
			eid: BASE_EID,
			backfillToken: null,
			backfillDone: true,
		} as LayerZeroSyncState);
		getMessagesMock.mockResolvedValueOnce(page([], 'token1'));

		await runSync();

		expect(getMessagesMock).toHaveBeenCalledTimes(1);
	});

	it('keeps the cursor where the scan api stopped answering', async () => {
		jest.spyOn(layerZeroSyncStateRepository, 'findOne').mockResolvedValue({
			chain: ChainEnum.Base,
			oftAddress: OFT_ADDRESS,
			eid: BASE_EID,
			backfillToken: 'deeptoken',
			backfillDone: false,
		} as LayerZeroSyncState);

		getMessagesMock
			.mockResolvedValueOnce(page([], 'token1'))
			.mockResolvedValueOnce(undefined);

		await runSync();

		expect(lastState()).toMatchObject({
			backfillToken: 'deeptoken',
			backfillDone: false,
		});
	});

	it('restarts the walk when the chain was pointed at another oapp', async () => {
		jest.spyOn(layerZeroSyncStateRepository, 'findOne').mockResolvedValue({
			chain: ChainEnum.Base,
			oftAddress: '0xanotheroft',
			eid: BASE_EID,
			backfillToken: 'deeptoken',
			backfillDone: true,
		} as LayerZeroSyncState);
		getMessagesMock.mockResolvedValueOnce(page(['0xnew1']));

		await runSync();

		expect(getMessagesMock).toHaveBeenCalledWith(
			BASE_EID,
			OFT_ADDRESS,
			50,
			undefined,
		);
		expect(lastState()).toMatchObject({
			oftAddress: OFT_ADDRESS,
			backfillDone: true,
		});
	});
});
