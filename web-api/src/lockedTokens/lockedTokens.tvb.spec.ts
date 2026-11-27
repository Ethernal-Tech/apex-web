import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { BridgingModeEnum } from 'src/common/enum';
import { SettingsService } from 'src/settings/settings.service';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { TokenPriceService } from 'src/tokenPrice/tokenPrice.service';
import { HistoricalSnapshot } from './historicalSnapshot.entity';
import { LockedTokensService } from './lockedTokens.service';
import { MultiChainTvlService } from './multiChainTvl.service';
import { readSplMintDecimals } from './solanaBalance.helper';

jest.mock('./solanaBalance.helper', () => ({
	...jest.requireActual('./solanaBalance.helper'),
	readSplMintDecimals: jest.fn(),
}));

const SOL_ID = 1;
const USDC_ID = 2;
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// solana -> prime: SOL (currency) and a lock/unlock SPL token
const directionConfig = {
	solana: {
		tokens: {
			[SOL_ID]: { chainSpecific: 'lovelace' },
			[USDC_ID]: { chainSpecific: USDC_MINT },
		},
		destChain: {
			prime: [
				{ srcTokenID: SOL_ID, dstTokenID: 10 },
				{ srcTokenID: USDC_ID, dstTokenID: 11 },
			],
		},
	},
	prime: { tokens: { 10: { chainSpecific: 'lovelace' } }, destChain: {} },
};

const settingsResponse = {
	directionConfig,
	settingsPerMode: {
		[BridgingModeEnum.Reactor]: {
			bridgingSettings: { directionConfig: {} },
		},
		[BridgingModeEnum.Skyline]: {
			bridgingSettings: { directionConfig },
		},
	},
	layerZeroChains: [],
	ecosystemTokens: [],
};

/** DB sums as getAggregatedSum would return them, raw on-chain units. */
const dbSums = (
	srcChain: string,
	_dstChain: string,
	field: string,
	tokenID: number,
	isNative: boolean,
): string | null => {
	if (srcChain !== 'solana') return null;
	// 2.5 SOL bridged as currency
	if (field === 'amount' && tokenID === 0 && !isNative) return '2500000000';
	// 100 USDC (6 decimals) bridged, its fees paid in lamports (0.01 SOL)
	if (field === 'nativeTokenAmount' && tokenID === USDC_ID) return '100000000';
	if (field === 'amount' && tokenID === USDC_ID && isNative) return '10000000';
	return null;
};

describe('LockedTokensService TVB for a Solana origin', () => {
	let service: LockedTokensService;
	let cache: { get: jest.Mock; set: jest.Mock };
	const readDecimals = readSplMintDecimals as jest.Mock;

	const sumTransferred = () =>
		(
			service as unknown as {
				sumTransferredTokensPerChain: (
					dc: unknown,
					modes: BridgingModeEnum[],
				) => Promise<{
					result: { totalTransferred: Record<string, Record<string, string>> };
					errors: Record<string, string>;
				}>;
			}
		).sumTransferredTokensPerChain(directionConfig, [BridgingModeEnum.Skyline]);

	beforeEach(() => {
		readDecimals.mockReset();
		cache = { get: jest.fn().mockResolvedValue(undefined), set: jest.fn() };

		service = new LockedTokensService(
			{} as Repository<BridgeTransaction>,
			{} as Repository<HistoricalSnapshot>,
			cache as unknown as Cache,
			{ SettingsResponse: settingsResponse } as unknown as SettingsService,
			{
				rpc: { solanaUrl: 'http://solana.test' },
			} as unknown as AppConfigService,
			{} as MultiChainTvlService,
			{} as TokenPriceService,
		);

		jest
			.spyOn(
				service as unknown as {
					getAggregatedSum: (
						...args: Parameters<typeof dbSums>
					) => Promise<string | null>;
				},
				'getAggregatedSum',
			)
			.mockImplementation((...args) => Promise.resolve(dbSums(...args)));
	});

	it('converts lamports and SPL units to DFM by their own decimals', async () => {
		readDecimals.mockResolvedValue(6);

		const { result, errors } = await sumTransferred();

		expect(errors).toEqual({});
		expect(result.totalTransferred.solana).toEqual({
			// 2.5 SOL + 0.01 SOL of fees, in 6 decimals
			[SOL_ID]: '2510000',
			[USDC_ID]: '100000000',
		});
		expect(readDecimals).toHaveBeenCalledWith('http://solana.test', USDC_MINT);
		expect(cache.set).toHaveBeenCalled();
	});

	it('reads a mint decimals once per process', async () => {
		readDecimals.mockResolvedValue(6);

		await sumTransferred();
		await sumTransferred();

		expect(readDecimals).toHaveBeenCalledTimes(1);
	});

	it('leaves out a token whose decimals cannot be read, reports it and does not cache', async () => {
		readDecimals.mockRejectedValue(new Error('getTokenSupply failed: boom'));

		const { result, errors } = await sumTransferred();

		expect(errors).toEqual({
			[`solana/${USDC_ID}`]: 'getTokenSupply failed: boom',
		});
		// SOL itself is still counted, the token and its fees are not
		expect(result.totalTransferred.solana).toEqual({ [SOL_ID]: '2500000' });
		expect(cache.set).not.toHaveBeenCalled();
	});
});
