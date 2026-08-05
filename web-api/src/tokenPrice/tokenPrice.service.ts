import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { AxiosError } from 'axios';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { CoinGeckoPriceProvider } from './providers/coingecko.provider';
import { DefiLlamaPriceProvider } from './providers/defillama.provider';
import { TokenPriceProvider } from './providers/priceProvider.interface';
import { SettingsService } from 'src/settings/settings.service';
import { SettingsFullResponseDto } from 'src/settings/settings.dto';
import {
	buildTokenClasses,
	buildTokenIndex,
	TokenMember,
} from './tokenMapping';
import { PriceProviderEnum, TrackedToken } from './tokenPrice.config';
import { TrackedTokensRegistry } from './trackedTokens.registry';

const TOKEN_PRICE_CRON = '0 */10 * * * *'; // every 10 minutes, on the minute
const TOKEN_PRICE_JOB_NAME = 'updateTokenPrices';

export interface CachedTokenPrice {
	symbol: string;
	priceUsd: number;
	/** Provider the price came from. */
	source: PriceProviderEnum;
	fetchedAt: Date;
}

/** A bridge token joined with the cached price of the asset it represents. */
export interface PricedToken {
	/** Bridge tokenID, absent when the bridge does not know this asset. */
	id?: number;
	/** Ecosystem name of the tokenID, the symbol when there is no tokenID. */
	name: string;
	/** Tracked token symbol the price is cached under. */
	symbol: string;
	/** Chains defining this tokenID. */
	chains: string[];
	entry: CachedTokenPrice;
}

@Injectable()
export class TokenPriceService implements OnApplicationBootstrap {
	/** symbol -> last known good price. Overwritten on refresh, evicted only
	 * when the token leaves the tracked tokens config. */
	private readonly cache = new Map<string, CachedTokenPrice>();
	private symbolByTokenID = new Map<number, string>();
	/** tracked symbol -> the bridge tokens it prices, in config order. */
	private membersBySymbol = new Map<string, TokenMember[]>();
	private tokens: readonly TrackedToken[] = [];
	private indexedSettings?: SettingsFullResponseDto;
	private readonly providers: TokenPriceProvider[];

	constructor(
		private readonly schedulerRegistry: SchedulerRegistry,
		private readonly appConfig: AppConfigService,
		private readonly trackedTokens: TrackedTokensRegistry,
		private readonly settingsService: SettingsService,
		coinGecko: CoinGeckoPriceProvider,
		defiLlama: DefiLlamaPriceProvider,
	) {
		this.providers = this.orderProviders([coinGecko, defiLlama]);
	}

	onApplicationBootstrap(): void {
		// warm the cache instead of waiting for the first cron tick
		void this.refreshPrices();
	}

	// every 10 minutes
	@Cron(TOKEN_PRICE_CRON, { name: TOKEN_PRICE_JOB_NAME })
	async updateTokenPrices(): Promise<void> {
		const job = this.schedulerRegistry.getCronJob(TOKEN_PRICE_JOB_NAME);
		job.stop();
		try {
			await this.refreshPrices();
		} finally {
			job.start();

			Logger.debug(`Job ${TOKEN_PRICE_JOB_NAME} executed`);
		}
	}

	/**
	 * Picks up tracked tokens config changes, then queries the providers in
	 * configured order and updates the cache.
	 * A token is only asked of the next provider if the previous ones did not
	 * return it, so a partial outage degrades per token instead of per request.
	 * Never throws - a token that no provider resolves keeps its cached price.
	 */
	async refreshPrices(): Promise<void> {
		const tracked = this.syncTrackedTokens();
		const resolved = new Map<string, CachedTokenPrice>();
		let pending: TrackedToken[] = [...tracked];

		for (const provider of this.providers) {
			if (pending.length === 0) {
				break;
			}

			const prices = await this.fetchFromProvider(provider, pending);
			const fetchedAt = new Date();

			for (const [symbol, priceUsd] of Object.entries(prices)) {
				resolved.set(symbol, {
					symbol,
					priceUsd,
					source: provider.name,
					fetchedAt,
				});
			}

			pending = pending.filter((token) => !resolved.has(token.symbol));
		}

		for (const entry of resolved.values()) {
			this.cache.set(entry.symbol, entry);
		}

		if (resolved.size > 0) {
			Logger.log(
				`${TOKEN_PRICE_JOB_NAME}: cached ${[...resolved.values()]
					.map((e) => `${e.symbol}=${e.priceUsd} (${e.source})`)
					.join(', ')}`,
			);
		}

		if (pending.length > 0) {
			Logger.warn(
				`${TOKEN_PRICE_JOB_NAME}: no provider returned a price for ${pending
					.map(
						(token) =>
							`${token.symbol}${this.cache.has(token.symbol) ? ' (keeping cached value)' : ''}`,
					)
					.join(', ')}`,
			);
		}
	}

	/** Cached price entry, whether fresh or stale. */
	getPrice(symbol: string): CachedTokenPrice | undefined {
		return this.cache.get(symbol.toUpperCase());
	}

	getPriceUsd(symbol: string): number | undefined {
		return this.getPrice(symbol)?.priceUsd;
	}

	/** Resolves a price from an internal bridge token ID. */
	getPriceUsdByTokenID(tokenID: number): number | undefined {
		const symbol = this.symbolByTokenID.get(tokenID);
		return symbol ? this.getPriceUsd(symbol) : undefined;
	}

	getPrices(): CachedTokenPrice[] {
		return [...this.cache.values()];
	}

	/**
	 * One entry per bridge token, so callers can join a price straight onto
	 * amounts keyed by tokenID or by ecosystem name, without matching symbols
	 * themselves. Every representation of an asset carries the same price:
	 * tokenIDs 2 (ADA) and 4 (xADA) both come back priced as ADA.
	 *
	 * A tracked token the bridge does not know yet still yields a single entry,
	 * with no id and the symbol as its name.
	 */
	getPricedTokens(): PricedToken[] {
		this.syncTrackedTokens();

		const priced: PricedToken[] = [];

		for (const [symbol, members] of this.membersBySymbol) {
			const entry = this.cache.get(symbol);
			if (!entry) {
				continue;
			}

			if (members.length === 0) {
				priced.push({ symbol, name: symbol, chains: [], entry });
				continue;
			}

			for (const member of members) {
				priced.push({
					id: member.tokenID,
					name: member.name ?? symbol,
					symbol,
					chains: member.chains,
					entry,
				});
			}
		}

		return priced;
	}

	/** True when the entry is older than the configured staleness threshold. */
	isStale(entry: CachedTokenPrice): boolean {
		const thresholdMs =
			this.appConfig.prices.stalenessThresholdMinutes * 60 * 1000;
		return Date.now() - entry.fetchedAt.getTime() > thresholdMs;
	}

	/**
	 * Re-reads the tracked tokens config and, when it or the bridge settings
	 * changed, rebuilds the tokenID index and drops cached prices of tokens no
	 * longer tracked.
	 */
	private syncTrackedTokens(): readonly TrackedToken[] {
		const tokens = this.trackedTokens.getTokens();
		const settings = this.settingsService.SettingsResponse;
		if (tokens === this.tokens && settings === this.indexedSettings) {
			return tokens;
		}
		this.tokens = tokens;
		this.indexedSettings = settings;

		// tokenIDs are derived from the bridge itself: every representation of an
		// asset (xADA, cAP3X, bAP3X, ...) is reachable from the direction config,
		// so a new wrapped token needs no config change here
		const classes = buildTokenClasses(
			settings?.directionConfig ?? {},
			settings?.ecosystemTokens ?? [],
		);
		const { symbolByTokenID, membersBySymbol, unmatched } = buildTokenIndex(
			tokens,
			classes,
		);
		this.symbolByTokenID = symbolByTokenID;
		this.membersBySymbol = membersBySymbol;

		if (unmatched.length > 0) {
			Logger.warn(
				`Tracked tokens matching no bridge asset: ${unmatched.map((token) => token.symbol).join(', ')}. Their price is still cached, but cannot be resolved from a tokenID - check the symbol/aliases against the ecosystem token names.`,
			);
		}

		const trackedSymbols = new Set(tokens.map((token) => token.symbol));
		for (const symbol of this.cache.keys()) {
			if (!trackedSymbols.has(symbol)) {
				this.cache.delete(symbol);
			}
		}

		return tokens;
	}

	private async fetchFromProvider(
		provider: TokenPriceProvider,
		tokens: readonly TrackedToken[],
	) {
		try {
			return await provider.fetchPrices(tokens);
		} catch (error) {
			if (error instanceof AxiosError) {
				Logger.error(
					`Error while fetching prices from ${provider.name}: ${error}. response: ${JSON.stringify(error.response?.data)}`,
					error.stack,
				);
			} else {
				Logger.error(
					`Error while fetching prices from ${provider.name}: ${error}`,
					error instanceof Error ? error.stack : undefined,
				);
			}
			return {};
		}
	}

	private orderProviders(
		available: TokenPriceProvider[],
	): TokenPriceProvider[] {
		const order = this.appConfig.prices.providerOrder;
		const ordered = order
			.map((name) => available.find((provider) => provider.name === name))
			.filter((provider): provider is TokenPriceProvider => !!provider);

		if (ordered.length === 0) {
			Logger.warn(
				`No known price provider in TOKEN_PRICE_PROVIDERS (${order.join(', ')}), falling back to ${available
					.map((p) => p.name)
					.join(', ')}`,
			);
			return available;
		}

		return ordered;
	}
}
