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

/** GET /prices/current/coingecko:cardano,coingecko:apex-4 */
type DefiLlamaPricesResponse = {
	coins?: Record<
		string,
		{ price?: number; symbol?: string; timestamp?: number; confidence?: number }
	>;
};

@Injectable()
export class DefiLlamaPriceProvider implements TokenPriceProvider {
	readonly name = PriceProviderEnum.DefiLlama;

	constructor(private readonly appConfig: AppConfigService) {}

	async fetchPrices(tokens: readonly TrackedToken[]): Promise<ProviderPrices> {
		const supported = supportedTokens(this.name, tokens);
		if (supported.length === 0) {
			return {};
		}

		const ids = supported.map((token) => token.ids[this.name]!);
		const endpointUrl =
			`${this.appConfig.prices.defillamaApiUrl}/prices/current/` +
			ids.map((id) => encodeURIComponent(id)).join(',');

		Logger.debug(`axios.get: ${endpointUrl}`);
		const response = await axios.get<DefiLlamaPricesResponse>(endpointUrl, {
			timeout: this.appConfig.prices.requestTimeoutMs,
		});
		Logger.debug(`axios.response: ${JSON.stringify(response.data)}`);

		const prices: ProviderPrices = {};
		for (const token of supported) {
			const coin = response.data?.coins?.[token.ids[this.name]!];
			const price = coin?.price;
			if (!isValidPrice(price)) {
				continue;
			}

			if (coin?.confidence !== undefined && coin.confidence < 0.9) {
				Logger.warn(
					`${this.name}: low confidence (${coin.confidence}) for ${token.symbol}, using it anyway`,
				);
			}

			prices[token.symbol] = price;
		}

		return prices;
	}
}
