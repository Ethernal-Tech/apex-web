import { LockedTokensDto } from './lockedTokens.dto';
import { sumLockedUsd, sumTransferredUsd } from './lockedTokensSummary.helper';

const APEX_ID = 1;
const ADA_ID = 2;
const UNPRICED_ID = 99;

const prices: Record<number, number> = {
	[APEX_ID]: 0.5,
	[ADA_ID]: 2,
};

const priceOf = (tokenID: number): number | undefined => prices[tokenID];

const chains: LockedTokensDto['chains'] = {
	prime: {
		[APEX_ID]: { addr1: '1000000', addr2: '500000' }, // 1.5 APEX
	},
	cardano: {
		[ADA_ID]: { addr3: '2000000' }, // 2 ADA
		[UNPRICED_ID]: { addr3: '9000000' },
	},
	// reported nowhere, see UNREPORTED_CHAINS
	arbitrum: {
		[APEX_ID]: { addr4: '100000000' },
	},
};

describe('sumLockedUsd', () => {
	it('sums every address balance at its token price', () => {
		// 1.5 APEX * 0.5 + 2 ADA * 2
		expect(sumLockedUsd(chains, priceOf)).toBeCloseTo(4.75);
	});

	it('skips chains kept out of reported figures', () => {
		const withoutUnreported = { ...chains };
		delete withoutUnreported.arbitrum;

		expect(sumLockedUsd(chains, priceOf)).toBeCloseTo(
			sumLockedUsd(withoutUnreported, priceOf),
		);
	});

	it('adds the LayerZero balance under the given token', () => {
		const layerZero = { tokenID: APEX_ID, amountDfm: BigInt(4_000_000) };

		// + 4 APEX * 0.5
		expect(sumLockedUsd(chains, priceOf, layerZero)).toBeCloseTo(6.75);
	});

	it('treats a malformed amount as zero', () => {
		expect(
			sumLockedUsd(
				{ prime: { [APEX_ID]: { addr1: 'not a number' } } },
				priceOf,
			),
		).toBe(0);
	});

	it('is zero when no price is known', () => {
		expect(sumLockedUsd(chains, () => undefined)).toBe(0);
	});
});

describe('sumTransferredUsd', () => {
	const totalTransferred: LockedTokensDto['totalTransferred'] = {
		prime: { [APEX_ID]: '10000000' }, // 10 APEX
		cardano: { [ADA_ID]: '3000000', [UNPRICED_ID]: '7000000' }, // 3 ADA
		arbitrum: { [APEX_ID]: '100000000' },
	};

	it('sums the per chain totals at their token price, less unreported chains', () => {
		// 10 APEX * 0.5 + 3 ADA * 2
		expect(sumTransferredUsd(totalTransferred, priceOf)).toBeCloseTo(11);
	});

	it('handles an empty payload', () => {
		expect(sumTransferredUsd({}, priceOf)).toBe(0);
	});
});
