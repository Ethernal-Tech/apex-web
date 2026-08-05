import { PriceProviderEnum, TrackedToken } from '../tokenPrice.config';

/** USD prices keyed by TrackedToken.symbol. */
export type ProviderPrices = Record<string, number>;

export interface TokenPriceProvider {
	readonly name: PriceProviderEnum;

	/**
	 * Fetches USD prices for the given tokens in a single request.
	 * Partial results are fine - symbols left out are looked up in the next
	 * provider. Throwing is fine too, the service logs and falls through.
	 */
	fetchPrices(tokens: readonly TrackedToken[]): Promise<ProviderPrices>;
}

/** Keeps only the tokens this provider has an identifier for. */
export const supportedTokens = (
	provider: PriceProviderEnum,
	tokens: readonly TrackedToken[],
): TrackedToken[] => tokens.filter((token) => !!token.ids[provider]);

/** Guards against nulls, strings and negative values coming from the APIs. */
export const isValidPrice = (price: unknown): price is number =>
	typeof price === 'number' && Number.isFinite(price) && price > 0;
