import { BadRequestException, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { ErrorResponseDto } from 'src/transaction/transaction.dto';
import { BalanceTokenDto } from './balance.dto';

type TokenAmountDto = {
	pid: string;
	nam: string;
	val: number | string;
};

type CardanoApiBalanceResponse = {
	chain: string;
	address: string;
	amount: string;
	tokens: TokenAmountDto[];
};

/** Cardano native asset id: policyId hex + asset name hex (Blockfrost/Ogmios/CIP-30 style). */
function toAssetUnit(token: TokenAmountDto): string {
	const nameHex = Buffer.from(token.nam ?? '', 'utf8').toString('hex');
	return `${token.pid ?? ''}${nameHex}`;
}

/**
 * Proxies to cardano-api `GET /api/CardanoTx/GetBalance`.
 */
export async function fetchCardanoAddressBalance(
	baseUrl: string,
	apiKey: string | undefined,
	chain: string,
	address: string,
	timeoutMs: number,
): Promise<{ amount: string; tokens: BalanceTokenDto[] }> {
	const endpointUrl =
		`${baseUrl.replace(/\/$/, '')}/api/CardanoTx/GetBalance` +
		`?chainId=${encodeURIComponent(chain)}` +
		`&address=${encodeURIComponent(address)}`;

	Logger.debug(`axios.get: ${endpointUrl}`);

	try {
		const response = await axios.get<CardanoApiBalanceResponse>(endpointUrl, {
			headers: {
				'X-API-KEY': apiKey,
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
			timeout: timeoutMs,
		});

		Logger.debug(`axios.response: ${JSON.stringify(response.data)}`);

		const data = response.data;
		const tokens = (Array.isArray(data.tokens) ? data.tokens : []).map((t) => ({
			unit: toAssetUnit(t),
			amount: String(t.val ?? '0'),
		}));

		return {
			amount: data.amount ?? '0',
			tokens,
		};
	} catch (error) {
		if (error instanceof AxiosError && error.response) {
			throw new BadRequestException(error.response.data as ErrorResponseDto);
		}

		throw new BadRequestException(
			error instanceof Error
				? error.message
				: 'Failed to fetch Cardano address balance',
		);
	}
}
