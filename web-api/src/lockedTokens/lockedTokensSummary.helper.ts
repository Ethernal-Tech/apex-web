import { LockedTokensDto } from './lockedTokens.dto';

/** Every amount `/lockedTokens` serves is in DFM - 6 decimals. */
const DFM_UNIT = 1_000_000;

/**
 * Chains kept out of every reported figure - TVL, TVB and the whole audit
 * breakdown.
 *
 * Mirrors `UNREPORTED_CHAINS` in `frontend-new/src/lib/chains.ts`, which drops
 * the same chains from the breakdown the audit page builds itself. The two
 * lists have to agree, or the header would report a total the table below it
 * does not add up to.
 */
export const UNREPORTED_CHAINS = new Set(['arbitrum', 'scroll']);

/** True for a chain no reported figure may include. See UNREPORTED_CHAINS. */
export const isUnreportedChain = (chain: string): boolean =>
	UNREPORTED_CHAINS.has(chain.toLowerCase());

/** tokenID -> USD price, absent for a token no price is cached for. */
export type PriceLookup = (tokenID: number) => number | undefined;

function toBigInt(amount: string): bigint {
	try {
		return BigInt(amount || '0');
	} catch {
		return BigInt(0);
	}
}

/** Σ amount × USD price. Tokens without a cached price are skipped. */
function totalsToUsd(
	totals: Map<number, bigint>,
	priceOf: PriceLookup,
): number {
	let usd = 0;

	for (const [tokenID, amount] of totals) {
		const price = priceOf(tokenID);
		if (!price) continue;

		usd += (Number(amount) / DFM_UNIT) * price;
	}

	return usd;
}

function addAmount(
	totals: Map<number, bigint>,
	tokenID: number,
	amount: bigint,
): void {
	totals.set(tokenID, (totals.get(tokenID) ?? BigInt(0)) + amount);
}

/**
 * Total value locked, in USD: every bridging address balance `/lockedTokens`
 * reports, plus the APEX held by the Nexus OFT contract, which is read from the
 * chain rather than served in `chains`.
 */
export function sumLockedUsd(
	chains: LockedTokensDto['chains'],
	priceOf: PriceLookup,
	layerZero?: { tokenID: number; amountDfm: bigint },
): number {
	const totals = new Map<number, bigint>();

	for (const [chain, tokenMap] of Object.entries(chains ?? {})) {
		if (isUnreportedChain(chain)) continue;

		for (const [tokenID, addressMap] of Object.entries(tokenMap ?? {})) {
			for (const amount of Object.values(addressMap ?? {})) {
				addAmount(totals, Number(tokenID), toBigInt(amount));
			}
		}
	}

	if (layerZero && layerZero.amountDfm > BigInt(0)) {
		addAmount(totals, layerZero.tokenID, layerZero.amountDfm);
	}

	return totalsToUsd(totals, priceOf);
}

/** Total value bridged, in USD, from the per-chain transferred totals. */
export function sumTransferredUsd(
	totalTransferred: LockedTokensDto['totalTransferred'],
	priceOf: PriceLookup,
): number {
	const totals = new Map<number, bigint>();

	for (const [chain, tokenMap] of Object.entries(totalTransferred ?? {})) {
		if (isUnreportedChain(chain)) continue;

		for (const [tokenID, amount] of Object.entries(tokenMap ?? {})) {
			addAmount(totals, Number(tokenID), toBigInt(amount));
		}
	}

	return totalsToUsd(totals, priceOf);
}
