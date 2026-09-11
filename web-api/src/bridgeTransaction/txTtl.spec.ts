import { getAppConfig } from 'src/appConfig/appConfig';
import { getLatestBlockOrSlot } from 'src/blockchain/latestBlock';
import { ChainEnum } from 'src/common/enum';
import {
	getTxTTL,
	parseConstructedTtl,
	serializeConstructedTxRaw,
} from './bridgeTransaction.helper';
import {
	getTtlMaxAhead,
	getTtlOffset,
	resolveTxRaw,
	shouldConstructTtl,
} from './txTtl';

jest.mock('src/appConfig/appConfig', () => ({
	getAppConfig: jest.fn(),
}));

jest.mock('src/blockchain/latestBlock', () => ({
	getLatestBlockOrSlot: jest.fn(),
}));

const mockGetAppConfig = getAppConfig as jest.MockedFunction<
	typeof getAppConfig
>;
const mockGetLatest = getLatestBlockOrSlot as jest.MockedFunction<
	typeof getLatestBlockOrSlot
>;

const mockBridgeConfig = (overrides: Record<string, unknown> = {}): void => {
	mockGetAppConfig.mockReturnValue({
		bridge: {
			ethTxTtlInc: 50,
			...overrides,
		},
	} as ReturnType<typeof getAppConfig>);
};

describe('shouldConstructTtl', () => {
	const latest = BigInt(1000);

	it('constructs when TTL is missing', () => {
		expect(
			shouldConstructTtl(undefined, latest, getTtlMaxAhead(ChainEnum.Nexus)),
		).toBe(true);
	});

	it('keeps a TTL within the chain cap', () => {
		const maxAhead = getTtlMaxAhead(ChainEnum.Nexus);
		expect(shouldConstructTtl(latest + maxAhead, latest, maxAhead)).toBe(false);
	});

	it('constructs when TTL exceeds the chain cap', () => {
		const maxAhead = getTtlMaxAhead(ChainEnum.Nexus);
		expect(
			shouldConstructTtl(latest + maxAhead + BigInt(1), latest, maxAhead),
		).toBe(true);
	});

	it('treats the same TTL as too far on Nexus but fine on Prime', () => {
		const ttl = latest + getTtlMaxAhead(ChainEnum.Nexus) + BigInt(1);
		expect(
			shouldConstructTtl(ttl, latest, getTtlMaxAhead(ChainEnum.Nexus)),
		).toBe(true);
		expect(
			shouldConstructTtl(ttl, latest, getTtlMaxAhead(ChainEnum.Prime)),
		).toBe(false);
	});
});

describe('getTtlOffset', () => {
	it('uses a larger offset for Cardano than Nexus', () => {
		expect(getTtlOffset(ChainEnum.Nexus)).toBeLessThan(
			getTtlOffset(ChainEnum.Prime),
		);
		expect(getTtlOffset(ChainEnum.Prime)).toBe(getTtlOffset(ChainEnum.Vector));
	});

	it('stays below the max-ahead cap so constructed TTL would not be rejected', () => {
		const chains = [ChainEnum.Nexus, ChainEnum.Prime, ChainEnum.Vector];
		for (const chain of chains) {
			expect(getTtlOffset(chain)).toBeLessThan(getTtlMaxAhead(chain));
		}
	});
});

describe('constructed TTL storage', () => {
	it('round-trips through getTxTTL', () => {
		const stored = serializeConstructedTxRaw(BigInt(12345));
		expect(parseConstructedTtl(stored)).toBe(BigInt(12345));
		expect(getTxTTL(ChainEnum.Nexus, stored)).toBe(BigInt(12345));
		expect(getTxTTL(ChainEnum.Prime, stored)).toBe(BigInt(12345));
		expect(getTxTTL(ChainEnum.Vector, stored)).toBe(BigInt(12345));
	});
});

describe('resolveStoredTxRaw', () => {
	const latest = BigInt(1000);

	beforeEach(() => {
		mockBridgeConfig();
		mockGetLatest.mockReset();
		mockGetLatest.mockResolvedValue(latest);
	});

	it('keeps frontend ETH txRaw when TTL is reasonable', async () => {
		const block = '1200';
		const txRaw = JSON.stringify({ block });
		const stored = await resolveTxRaw(ChainEnum.Nexus, txRaw);
		expect(stored).toBe(txRaw);
		expect(getTxTTL(ChainEnum.Nexus, stored)).toBe(
			BigInt(block) + BigInt(getAppConfig().bridge.ethTxTtlInc),
		);
	});

	it('constructs TTL when txRaw is missing', async () => {
		const stored = await resolveTxRaw(ChainEnum.Nexus);
		expect(JSON.parse(stored)).toEqual({
			constructedTtl: (latest + getTtlOffset(ChainEnum.Nexus)).toString(),
		});
	});

	it('constructs TTL when frontend TTL is abnormally large', async () => {
		const txRaw = JSON.stringify({ block: '999999' });
		const stored = await resolveTxRaw(ChainEnum.Nexus, txRaw);
		expect(JSON.parse(stored)).toEqual({
			constructedTtl: (latest + getTtlOffset(ChainEnum.Nexus)).toString(),
		});
	});

	it('constructs TTL when Cardano txRaw is missing', async () => {
		const stored = await resolveTxRaw(ChainEnum.Prime);
		expect(JSON.parse(stored)).toEqual({
			constructedTtl: (latest + getTtlOffset(ChainEnum.Prime)).toString(),
		});
	});
});
