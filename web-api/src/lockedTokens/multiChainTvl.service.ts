import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { SettingsService } from 'src/settings/settings.service';
import { BridgingSettingsTokenDto } from 'src/settings/settings.dto';
import {
	getSkylineNativeTokenWalletAddress,
	Lovelace,
} from 'src/settings/utils';
import { ChainEnum } from 'src/common/enum';
import { rawToDfm } from 'src/utils/generalUtils';
import { isEvmAddress } from 'src/utils/evmRpc';
import {
	readErc20Balance,
	readErc20Decimals,
	readEvmCurrencyBalance,
} from './evmBalance.helper';
import {
	isSolanaAddress,
	readSolBalance,
	readSplBalance,
} from './solanaBalance.helper';

/** chain -> tokenID -> holder address -> amount in DFM, the shape /lockedTokens serves. */
export type ChainTokenAmounts = {
	[chain: string]: { [tokenID: string]: { [address: string]: string } };
};

export type MultiChainTvl = {
	chains: ChainTokenAmounts;
	/** Keyed by `chain` or `chain/tokenID`; empty when everything was read. */
	errors: Record<string, string>;
};

const CACHE_KEY = 'multiChainLockedTokens';
/** Matches cardano-api's 30s locked-tokens cache. cache-manager v7 TTLs are ms. */
const CACHE_TTL_MS = 30_000;
/** Partial results expire sooner, so one flaky RPC is not pinned for a full TTL. */
const PARTIAL_CACHE_TTL_MS = 5_000;
/** EVM native currency, and Solana lamports. */
const EVM_CURRENCY_DECIMALS = 18;
const SOL_DECIMALS = 9;
/** Courtesy gap between token reads, for rate-limited public endpoints. */
const TOKEN_READ_DELAY_MS = 60;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const errorMessage = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);

type TokenToRead = {
	tokenID: string;
	/** Cardano `policyID.name`, EVM ERC-20 address, or Solana mint. */
	chainSpecific: string;
	isCurrency: boolean;
};

/**
 * Locked balances for the chains cardano-api does not cover.
 *
 * cardano-api's `GetLockedTokens` reads UTxO bridging addresses only, so EVM
 * and Solana chains never appear in it. This reads them the equivalent way -
 * the account that actually holds the locked funds, one balance per configured
 * token - and returns the same nested shape so the two merge.
 *
 * Which tokens count is decided by the settings, per (chain, token) pair: the
 * chain's currency (`chainSpecific === 'lovelace'`) always, and any other token
 * only when `lockUnlock` is true. A minted/burned token is backed by collateral
 * held on the source chain, so counting it here would double-count the asset.
 */
@Injectable()
export class MultiChainTvlService {
	constructor(
		@Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
		private readonly settingsService: SettingsService,
		private readonly appConfig: AppConfigService,
	) {}

	/** Deduplicates concurrent refreshes; cardano-api's cache has no such guard. */
	private inFlight: Promise<MultiChainTvl> | null = null;

	public async getLockedTokens(): Promise<MultiChainTvl> {
		const cached = await this.cacheManager.get<MultiChainTvl>(CACHE_KEY);
		if (cached !== undefined && cached !== null) {
			return cached;
		}

		if (this.inFlight) {
			return this.inFlight;
		}

		this.inFlight = this.readAllChains()
			.then(async (result) => {
				const hasErrors = Object.keys(result.errors).length > 0;
				await this.cacheManager.set(
					CACHE_KEY,
					result,
					hasErrors ? PARTIAL_CACHE_TTL_MS : CACHE_TTL_MS,
				);

				return result;
			})
			.finally(() => {
				this.inFlight = null;
			});

		return this.inFlight;
	}

	private async readAllChains(): Promise<MultiChainTvl> {
		const directionConfig =
			this.settingsService.SettingsResponse?.directionConfig ?? {};

		const chains: ChainTokenAmounts = {};
		const errors: Record<string, string> = {};

		const perChain = await Promise.allSettled(
			Object.keys(directionConfig).map(async (chain) => {
				const tokens = this.tokensToRead(directionConfig[chain]?.tokens);
				if (tokens.length === 0) {
					return null;
				}

				if (chain === (ChainEnum.Solana as string)) {
					return {
						chain,
						result: await this.readSolanaChain(chain, tokens, errors),
					};
				}

				const rpcUrl = this.evmRpcUrl(chain);
				const holder = this.evmHolder(chain);
				if (!holder) {
					// A chain with no native token wallet is not an EVM chain this
					// service covers - the Cardano ones land here and are read by
					// cardano-api. evmHolder has already warned about a malformed one.
					return null;
				}
				if (!rpcUrl) {
					// Configured to hold funds but unreachable: say so, rather than
					// letting it look indistinguishable from holding nothing.
					throw new Error(`no EVM_RPC_URL_${chain.toUpperCase()} set`);
				}

				return {
					chain,
					result: await this.readEvmChain(
						chain,
						rpcUrl,
						holder,
						tokens,
						errors,
					),
				};
			}),
		);

		Object.keys(directionConfig).forEach((chain, index) => {
			const outcome = perChain[index];

			if (outcome.status === 'rejected') {
				errors[chain] = errorMessage(outcome.reason);
				Logger.warn(`TVL: ${chain} failed: ${errors[chain]}`);
				return;
			}

			if (
				outcome.value?.result &&
				Object.keys(outcome.value.result).length > 0
			) {
				chains[outcome.value.chain] = outcome.value.result;
			}
		});

		Logger.debug(
			`TVL: read ${Object.keys(chains).length} chain(s) [${Object.keys(chains).join(', ')}]` +
				(Object.keys(errors).length > 0
					? `, ${Object.keys(errors).length} failure(s)`
					: ''),
		);

		return { chains, errors };
	}

	/**
	 * The chain's currency plus its lock/unlock tokens. Both flags are read per
	 * (chain, token): the same token can be lock/unlock on one chain and
	 * minted on another.
	 */
	private tokensToRead(
		tokens: Record<number, BridgingSettingsTokenDto> | undefined,
	): TokenToRead[] {
		return Object.entries(tokens ?? {})
			.map(([tokenID, token]) => ({
				tokenID,
				chainSpecific: token?.chainSpecific ?? '',
				isCurrency: token?.chainSpecific === Lovelace,
				lockUnlock: !!token?.lockUnlock,
			}))
			.filter(
				// an empty chainSpecific means the settings could not resolve the
				// token, e.g. an unconfigured LayerZero token
				(token) =>
					token.isCurrency || (token.lockUnlock && !!token.chainSpecific),
			)
			.map(({ tokenID, chainSpecific, isCurrency }) => ({
				tokenID,
				chainSpecific,
				isCurrency,
			}));
	}

	private evmRpcUrl(chain: string): string | undefined {
		return this.appConfig.rpc?.evmUrls?.find((entry) => entry.chain === chain)
			?.value;
	}

	/**
	 * The native token wallet contract holds both the locked currency and the
	 * locked ERC-20s
	 */
	private evmHolder(chain: string): string | undefined {
		const resolved = getSkylineNativeTokenWalletAddress(chain);

		if (!resolved) {
			return undefined;
		}

		if (!isEvmAddress(resolved)) {
			Logger.warn(
				`TVL: skipping ${chain}, its resolved native token wallet "${resolved}" is not a 20-byte address`,
			);
			return undefined;
		}

		return resolved;
	}

	private async readEvmChain(
		chain: string,
		rpcUrl: string,
		holder: string,
		tokens: TokenToRead[],
		errors: Record<string, string>,
	): Promise<Record<string, Record<string, string>>> {
		const result: Record<string, Record<string, string>> = {};

		for (const token of tokens) {
			try {
				const amount = token.isCurrency
					? rawToDfm(
							await readEvmCurrencyBalance(rpcUrl, holder),
							EVM_CURRENCY_DECIMALS,
						)
					: rawToDfm(
							await readErc20Balance(rpcUrl, token.chainSpecific, holder),
							await this.erc20Decimals(chain, rpcUrl, token.chainSpecific),
						);

				result[token.tokenID] = { [holder]: amount };
			} catch (error) {
				errors[`${chain}/${token.tokenID}`] = errorMessage(error);
				Logger.warn(
					`TVL: ${chain} token ${token.tokenID} failed: ${errorMessage(error)}`,
				);
			}

			await sleep(TOKEN_READ_DELAY_MS);
		}

		return result;
	}

	/** `decimals()` cannot change, so one read per token per process. */
	private readonly decimalsCache = new Map<string, number>();

	private async erc20Decimals(
		chain: string,
		rpcUrl: string,
		tokenAddress: string,
	): Promise<number> {
		const key = `${chain}:${tokenAddress.toLowerCase()}`;
		const cached = this.decimalsCache.get(key);
		if (cached !== undefined) {
			return cached;
		}

		const decimals = await readErc20Decimals(rpcUrl, tokenAddress);
		this.decimalsCache.set(key, decimals);

		return decimals;
	}

	/**
	 * SOLANA_HOLDER_ADDRS only, deliberately never the bridging-address endpoint.
	 *
	 * For a Solana chain the oracle serves `TrackedProgram` - the program ID - and
	 * a program account holds no tokens. The balance lives in the associated token
	 * account it owns, which the endpoint does not expose, so reading what it
	 * returns would report zero rather than the locked amount. Only config knows
	 * the right account.
	 */
	private solanaHolders(chain: string): string[] {
		return (this.appConfig.rpc?.solanaHolders ?? [])
			.filter((entry) => entry.chain === chain)
			.map((entry) => entry.value)
			.filter(isSolanaAddress);
	}

	private async readSolanaChain(
		chain: string,
		tokens: TokenToRead[],
		errors: Record<string, string>,
	): Promise<Record<string, Record<string, string>>> {
		const rpcUrl = this.appConfig.rpc?.solanaUrl;
		if (!rpcUrl) {
			return {};
		}

		const holders = this.solanaHolders(chain);
		if (holders.length === 0) {
			Logger.warn(
				`TVL: skipping ${chain}, no SOLANA_HOLDER_ADDRS entry for it`,
			);
			return {};
		}

		const result: Record<string, Record<string, string>> = {};

		for (const holder of holders) {
			for (const token of tokens) {
				try {
					const amount = token.isCurrency
						? rawToDfm(await readSolBalance(rpcUrl, holder), SOL_DECIMALS)
						: await readSplBalance(rpcUrl, holder, token.chainSpecific).then(
								({ amount: raw, decimals }) => rawToDfm(raw, decimals),
							);

					result[token.tokenID] = {
						...(result[token.tokenID] ?? {}),
						[holder]: amount,
					};
				} catch (error) {
					errors[`${chain}/${token.tokenID}`] = errorMessage(error);
					Logger.warn(
						`TVL: ${chain} token ${token.tokenID} failed: ${errorMessage(error)}`,
					);
				}

				await sleep(TOKEN_READ_DELAY_MS);
			}
		}

		return result;
	}
}
