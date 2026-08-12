import { BadRequestException, Injectable } from '@nestjs/common';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { ChainApexBridgeEnum, ChainEnum } from 'src/common/enum';
import {
	ValidateCardanoAddress,
	ValidateEVMAddress,
	ValidateSolanaAddress,
} from 'src/utils/Address/addreses';
import {
	isCardanoChain,
	isEvmChain,
	isSolanaChain,
} from 'src/utils/chainUtils';
import { AddressBalanceDto } from './balance.dto';
import { fetchCardanoAddressBalance } from './balance.cardano';
import { fetchEvmAddressBalance } from './balance.evm';
import { fetchSolanaAddressBalance } from './balance.solana';

const REQUEST_TIMEOUT_MS = 15_000;

const DEFAULT_EVM_RPC: Record<'mainnet' | 'testnet', Record<string, string>> = {
	mainnet: {
		[ChainEnum.Nexus]: 'https://rpc.nexus.mainnet.apexfusion.org/',
		[ChainEnum.Base]: 'https://mainnet.base.org',
		[ChainEnum.BNB]: 'https://bsc-dataseed.bnbchain.org',
		[ChainEnum.Polygon]: 'https://polygon-rpc.com',
		[ChainEnum.Ethereum]: 'https://ethereum.publicnode.com',
		[ChainEnum.Arbitrum]: 'https://arb1.arbitrum.io/rpc',
		[ChainEnum.Scroll]: 'https://rpc.scroll.io',
		[ChainEnum.Unichain]: 'https://mainnet.unichain.org',
		[ChainEnum.Sei]: 'https://evm-rpc.sei-apis.com',
		[ChainEnum.Katana]: 'https://rpc.katanarpc.com',
	},
	testnet: {
		[ChainEnum.Nexus]: 'https://rpc.nexus.testnet.apexfusion.org',
		[ChainEnum.Polygon]: 'https://polygon-amoy.drpc.org',
		[ChainEnum.Ethereum]: 'https://ethereum-sepolia-rpc.publicnode.com',
		[ChainEnum.Arbitrum]: 'https://sepolia-rollup.arbitrum.io/rpc',
		[ChainEnum.Scroll]: 'https://sepolia-rpc.scroll.io',
		[ChainEnum.Unichain]: 'https://unichain-sepolia-rpc.publicnode.com',
		[ChainEnum.Sei]: 'https://evm-rpc-testnet.sei-apis.com',
		[ChainEnum.Katana]: 'https://rpc-bokuto.katanarpc.com',
	},
};

const DEFAULT_SOLANA_RPC: Record<'mainnet' | 'testnet', string> = {
	mainnet: 'https://api.mainnet.solana.com',
	testnet: 'https://api.devnet.solana.com',
};

function isBalanceEvmChain(chain: ChainEnum): boolean {
	return (
		isEvmChain(chain) || chain === ChainEnum.Base || chain === ChainEnum.BNB
	);
}

function parseTokenList(tokens?: string): string[] {
	if (!tokens?.trim()) return [];
	return tokens
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean);
}

function isChainEnum(value: string): value is ChainEnum {
	return Object.values(ChainEnum).includes(value as ChainEnum);
}

@Injectable()
export class BalanceService {
	constructor(private readonly appConfig: AppConfigService) {}

	async getAddressBalance(
		chainRaw: string,
		addressRaw: string,
		tokensRaw?: string,
	): Promise<AddressBalanceDto> {
		if (!chainRaw?.trim()) {
			throw new BadRequestException('Query param "chain" is required.');
		}
		if (!addressRaw?.trim()) {
			throw new BadRequestException('Query param "address" is required.');
		}

		const chain = chainRaw.trim() as ChainEnum;
		if (!isChainEnum(chain)) {
			throw new BadRequestException(`Unsupported chain: ${chainRaw}`);
		}

		const address = addressRaw.trim();
		const tokens = parseTokenList(tokensRaw);
		const isMainnet = !!this.appConfig.app.isMainnet;

		if (isBalanceEvmChain(chain)) {
			ValidateEVMAddress(address);
			const rpcUrl = this.resolveEvmRpcUrl(chain, isMainnet);
			const result = await fetchEvmAddressBalance(
				rpcUrl,
				address,
				tokens,
				REQUEST_TIMEOUT_MS,
			);
			return { chain, address, ...result };
		}

		if (isSolanaChain(chain)) {
			ValidateSolanaAddress(address);
			const rpcUrl = this.resolveSolanaRpcUrl(isMainnet);
			const result = await fetchSolanaAddressBalance(
				rpcUrl,
				address,
				tokens.length > 0 ? tokens : undefined,
				REQUEST_TIMEOUT_MS,
			);
			return { chain, address, ...result };
		}

		if (isCardanoChain(chain)) {
			ValidateCardanoAddress(chain as ChainApexBridgeEnum, address, isMainnet);
			const result = await fetchCardanoAddressBalance(
				this.appConfig.cardanoSkylineApiUrl,
				process.env.CARDANO_API_SKYLINE_API_KEY,
				chain,
				address,
				REQUEST_TIMEOUT_MS,
			);
			return { chain, address, ...result };
		}

		throw new BadRequestException(
			`Balance lookup is not supported for chain: ${chain}`,
		);
	}

	private resolveEvmRpcUrl(chain: ChainEnum, isMainnet: boolean): string {
		const fromConfig = this.appConfig.balances?.evmRpcUrls?.[chain];
		if (fromConfig?.trim()) return fromConfig.trim();

		const network = isMainnet ? 'mainnet' : 'testnet';
		const fallback = DEFAULT_EVM_RPC[network][chain];
		if (!fallback) {
			throw new BadRequestException(
				`No EVM RPC URL configured for chain "${chain}" (${network}). ` +
					`Set balances.evmRpcUrls.${chain} in app config.`,
			);
		}
		return fallback;
	}

	private resolveSolanaRpcUrl(isMainnet: boolean): string {
		const fromConfig = this.appConfig.balances?.solanaRpcUrl;
		if (fromConfig?.trim()) return fromConfig.trim();
		return DEFAULT_SOLANA_RPC[isMainnet ? 'mainnet' : 'testnet'];
	}
}
