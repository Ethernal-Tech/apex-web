import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { PriceProviderEnum, TrackedToken } from '../tokenPrice.config';
import {
	isValidPrice,
	ProviderPrices,
	supportedTokens,
	TokenPriceProvider,
} from './priceProvider.interface';

/** GET /simple/price?ids=cardano,apex-4&vs_currencies=usd */
type CoinGeckoSimplePriceResponse = Record<
	string,
	Record<string, number> | undefined
>;

@Injectable()
export class CoinGeckoPriceProvider implements TokenPriceProvider {
	readonly name = PriceProviderEnum.CoinGecko;

	constructor(private readonly appConfig: AppConfigService) {}

	async fetchPrices(tokens: readonly TrackedToken[]): Promise<ProviderPrices> {
		const supported = supportedTokens(this.name, tokens);
		if (supported.length === 0) {
			return {};
		}

		const ids = supported.map((token) => token.ids[this.name]!);
		const endpointUrl =
			`${this.appConfig.prices.coingeckoApiUrl}/simple/price` +
			`?ids=${encodeURIComponent(ids.join(','))}&vs_currencies=usd`;

		Logger.debug(`axios.get: ${endpointUrl}`);
		const response = await axios.get<CoinGeckoSimplePriceResponse>(
			endpointUrl,
			{
				headers: this.authHeaders(),
				timeout: this.appConfig.prices.requestTimeoutMs,
			},
		);
		Logger.debug(`axios.response: ${JSON.stringify(response.data)}`);

		const prices: ProviderPrices = {};
		for (const token of supported) {
			const price = response.data?.[token.ids[this.name]!]?.usd;
			if (isValidPrice(price)) {
				prices[token.symbol] = price;
			}
		}

		return prices;
	}

	private authHeaders(): Record<string, string> {
		const apiKey = this.appConfig.prices.coingeckoApiKey;
		if (!apiKey) {
			return {};
		}

		// the pro plan is served from a different host and expects its own header
		return this.appConfig.prices.coingeckoApiUrl.includes('pro-api')
			? { 'x-cg-pro-api-key': apiKey }
			: { 'x-cg-demo-api-key': apiKey };
	}
}
