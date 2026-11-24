import { BadRequestException, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { ErrorResponseDto } from 'src/transaction/transaction.dto';
import { BalanceTokenDto } from './balance.dto';

type CardanoApiSolanaBalanceResponse = {
	chain: string;
	address: string;
	amount: string;
	tokens: { mint: string; amount: string }[];
};

/**
 * Proxies to cardano-api `GET /api/Solana/GetBalance`, which reads through the
 * chain's rate-limited RPC client and caches per address. It returns every SPL
 * token configured for the chain; `mintFilter` narrows that down.
 */
export async function fetchSolanaAddressBalance(
	baseUrl: string,
	apiKey: string | undefined,
	chain: string,
	address: string,
	mintFilter: string[],
	timeoutMs: number,
): Promise<{ amount: string; tokens: BalanceTokenDto[] }> {
	const endpointUrl =
		`${baseUrl.replace(/\/$/, '')}/api/Solana/GetBalance` +
		`?chainId=${encodeURIComponent(chain)}` +
		`&address=${encodeURIComponent(address)}`;

	Logger.debug(`axios.get: ${endpointUrl}`);

	try {
		const response = await axios.get<CardanoApiSolanaBalanceResponse>(
			endpointUrl,
			{
				headers: {
					'X-API-KEY': apiKey,
					Accept: 'application/json',
				},
				timeout: timeoutMs,
			},
		);

		Logger.debug(`axios.response: ${JSON.stringify(response.data)}`);

		const filter = mintFilter.length > 0 ? new Set(mintFilter) : undefined;
		const tokens = (response.data.tokens ?? [])
			.filter((t) => !filter || filter.has(t.mint))
			.map((t) => ({ unit: t.mint, amount: t.amount }));

		return {
			amount: response.data.amount ?? '0',
			tokens,
		};
	} catch (error) {
		if (error instanceof AxiosError && error.response) {
			throw new BadRequestException(error.response.data as ErrorResponseDto);
		}

		throw new BadRequestException(
			error instanceof Error
				? error.message
				: 'Failed to fetch Solana address balance',
		);
	}
}
