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
			const rpcUrl = this.resolveEvmRpcUrl(chain);
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
			const rpcUrl = this.resolveSolanaRpcUrl();
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

	private resolveEvmRpcUrl(chain: ChainEnum): string {
		const fromConfig = this.appConfig.rpc?.evmUrls?.find(
			(entry) => entry.chain === chain,
		)?.value;
		if (fromConfig?.trim()) return fromConfig.trim();

		throw new BadRequestException(
			`No EVM RPC URL configured for chain "${chain}". ` +
				`Set EVM_RPC_URL_${chain.toUpperCase()}.`,
		);
	}

	private resolveSolanaRpcUrl(): string {
		const fromConfig = this.appConfig.rpc?.solanaUrl;
		if (fromConfig?.trim()) return fromConfig.trim();

		throw new BadRequestException(
			`No Solana RPC URL configured. Set SOLANA_RPC_URL.`,
		);
	}
}
