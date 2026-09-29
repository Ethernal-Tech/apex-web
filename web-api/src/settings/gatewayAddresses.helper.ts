import { Logger } from '@nestjs/common';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { ChainEnum } from 'src/common/enum';
import { isEvmChain } from 'src/utils/chainUtils';
import { checksumEvmAddress, ethCallAddress } from 'src/utils/evmRpc';
import { getBridgingAddresses } from './bridgingAddresses.helper';
import { BridgingSettingsDirectionConfigDto } from './settings.dto';

/**
 * The two skyline contract addresses per EVM chain, read off the chain itself at
 * startup rather than configured.
 *
 * The gateway comes from cardano-api, which for an EVM chain returns exactly the
 * oracle's configured bridging address. The native token wallet - the contract
 * that actually custodies locked currency and locked ERC-20s - is not a getter
 * on the gateway; it lives one hop further, behind the predicate:
 *
 *     Gateway.nativeTokenPredicate() -> NativeTokenPredicate
 *     NativeTokenPredicate.getNativeTokenWalletAddress()   (skyline gateway)
 *     NativeTokenPredicate.nativeTokenWallet()             (reactor gateway)
 *
 * Both spellings are tried because the two gateway generations differ on it
 * (apex-evm-gateway `feat/skyline` vs `main`), and which one is deployed on a
 * given chain is not something this service can know up front.
 */

/** `nativeTokenPredicate()`, on both gateway generations. */
const NATIVE_TOKEN_PREDICATE_SELECTOR = '0xd4945a2c';
/** `getNativeTokenWalletAddress()` then `nativeTokenWallet()`, on the predicate. */
const NATIVE_TOKEN_WALLET_SELECTORS = ['0x1a075f16', '0x60430449'];

export type EvmGatewayAddresses = {
	gateway: `0x${string}`;
	nativeTokenWallet: `0x${string}`;
};

/**
 * Resolved at startup by SettingsService and read through the getters in
 * utils.ts. A module singleton in the shape of getAppConfig(), because the
 * callers are free functions on the transaction-building path rather than
 * injectable services.
 */
let skylineEvmAddresses: Record<string, EvmGatewayAddresses> = {};

export const getSkylineEvmAddresses = (): Record<string, EvmGatewayAddresses> =>
	skylineEvmAddresses;

/**
 * The EVM chains skyline can bridge over, from the settings themselves.
 *
 * `directionConfig` rather than `enabledChains`: a chain a user can be quoted a
 * transaction for is a chain whose gateway has to be known, and that is what
 * directionConfig lists. LayerZero chains fall out on their own - isEvmChain
 * does not count base/bsc, whose transfers go through an OFT and never touch a
 * gateway.
 */
export const evmChainsFromDirectionConfig = (directionConfig: {
	[key: string]: BridgingSettingsDirectionConfigDto;
}): string[] =>
	Object.keys(directionConfig ?? {}).filter((chain) =>
		isEvmChain(chain as ChainEnum),
	);

const resolveNativeTokenWallet = async (
	rpcUrl: string,
	predicate: string,
	chain: string,
): Promise<`0x${string}`> => {
	const failures: string[] = [];

	for (const selector of NATIVE_TOKEN_WALLET_SELECTORS) {
		try {
			return await ethCallAddress(rpcUrl, predicate, selector);
		} catch (error) {
			failures.push(
				`${selector}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	throw new Error(
		`native token wallet unreadable from predicate ${predicate} on ${chain} (${failures.join('; ')})`,
	);
};

/**
 * cardano-api first, SKYLINE_GATEWAY_ADDRS second as a fallback.
 */
const resolveGateway = async (
	appConfig: AppConfigService,
	chain: string,
): Promise<`0x${string}`> => {
	try {
		const [bridgingAddress] = await getBridgingAddresses(
			appConfig.cardanoSkylineApiUrl,
			process.env.CARDANO_API_SKYLINE_API_KEY,
			chain,
		);

		return checksumEvmAddress(bridgingAddress);
	} catch (error) {
		const configured = appConfig.bridge?.addresses?.skylineGateway?.find(
			(entry) => entry.chain === chain,
		)?.address;

		if (!configured) {
			throw new Error(
				`gateway unavailable for ${chain}: cardano-api gave none ` +
					`(${error instanceof Error ? error.message : String(error)}) ` +
					`and there is no SKYLINE_GATEWAY_ADDRS entry`,
			);
		}

		Logger.warn(
			`${chain}: cardano-api served no gateway, falling back to ` +
				`SKYLINE_GATEWAY_ADDRS (${configured})`,
		);

		return checksumEvmAddress(configured);
	}
};

const resolveChain = async (
	appConfig: AppConfigService,
	chain: string,
): Promise<EvmGatewayAddresses> => {
	const gateway = await resolveGateway(appConfig, chain);

	const rpcUrl = appConfig.rpc?.evmUrls?.find(
		(entry) => entry.chain === chain,
	)?.value;

	if (!rpcUrl) {
		throw new Error(
			`no EVM_RPC_URL_${chain.toUpperCase()} set, needed to read the native token wallet for ${chain}`,
		);
	}

	const predicate = await ethCallAddress(
		rpcUrl,
		gateway,
		NATIVE_TOKEN_PREDICATE_SELECTOR,
	);

	const nativeTokenWallet = await resolveNativeTokenWallet(
		rpcUrl,
		predicate,
		chain,
	);

	Logger.log(
		`resolved ${chain}: gateway ${gateway}, native token wallet ${nativeTokenWallet}`,
	);

	return { gateway, nativeTokenWallet };
};

/**
 * Throws only when nothing at all resolved, which is the caller's retry signal.
 *
 * A chain that fails on its own is logged and left out: its getters then return
 * '' and its transactions are rejected, exactly as an unconfigured chain's were
 * before any of this was resolved remotely.
 */
export const resolveSkylineEvmAddresses = async (
	appConfig: AppConfigService,
	chains: string[],
): Promise<void> => {
	const outcomes = await Promise.allSettled(
		chains.map(
			async (chain) => [chain, await resolveChain(appConfig, chain)] as const,
		),
	);

	const resolved: Record<string, EvmGatewayAddresses> = {};
	const failures: string[] = [];

	outcomes.forEach((outcome, index) => {
		if (outcome.status === 'fulfilled') {
			const [chain, addresses] = outcome.value;
			resolved[chain] = addresses;
			return;
		}

		failures.push(chains[index]);
		// Warn, not error: a chain whose node is simply down is a routine state
		// here - scroll's public sepolia RPC is, at the time of writing - and the
		// only consequence is that this one chain is not bridgeable.
		Logger.warn(
			`could not resolve skyline addresses for ${chains[index]}, it will not ` +
				`be bridgeable: ${
					outcome.reason instanceof Error
						? outcome.reason.message
						: String(outcome.reason)
				}`,
		);
	});

	if (chains.length > 0 && Object.keys(resolved).length === 0) {
		throw new Error(
			`no skyline EVM addresses resolved for any of: ${chains.join(', ')}`,
		);
	}

	skylineEvmAddresses = resolved;

	Logger.log(
		`skyline EVM addresses resolved for ${Object.keys(resolved).length}/${chains.length} chain(s)` +
			(failures.length > 0 ? `, unresolved: ${failures.join(', ')}` : ''),
	);
};
