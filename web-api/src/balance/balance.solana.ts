import { BadRequestException, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { BalanceTokenDto } from './balance.dto';

const SPL_TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

type JsonRpcResponse<T> = {
	result?: T;
	error?: { message?: string; code?: number };
};

type ParsedTokenAccount = {
	account: {
		data: {
			parsed?: {
				info?: {
					mint?: string;
					tokenAmount?: { amount?: string };
				};
			};
		};
	};
};

async function solanaRpcCall<T>(
	rpcUrl: string,
	method: string,
	params: unknown[],
	timeoutMs: number,
): Promise<T> {
	Logger.debug(`solanaRpc ${method}: ${rpcUrl}`);
	try {
		const response = await axios.post(
			rpcUrl,
			{ jsonrpc: '2.0', id: 1, method, params },
			{
				headers: { 'Content-Type': 'application/json' },
				timeout: timeoutMs,
			},
		);
		const body = response.data as JsonRpcResponse<T>;
		if (body.error) {
			throw new BadRequestException(
				body.error.message ?? `Solana RPC error in ${method}`,
			);
		}
		if (body.result === undefined) {
			throw new BadRequestException(
				`Solana RPC returned no result for ${method}`,
			);
		}
		return body.result;
	} catch (e) {
		if (e instanceof BadRequestException) throw e;
		if (e instanceof AxiosError) {
			throw new BadRequestException(`Solana RPC request failed: ${e.message}`);
		}
		throw new BadRequestException(
			`Solana RPC request failed: ${e instanceof Error ? e.message : String(e)}`,
		);
	}
}

export async function fetchSolanaAddressBalance(
	rpcUrl: string,
	address: string,
	mintFilter: string[] | undefined,
	timeoutMs: number,
): Promise<{ amount: string; tokens: BalanceTokenDto[] }> {
	const [balanceResult, tokenAccounts] = await Promise.all([
		solanaRpcCall<{ value: number }>(
			rpcUrl,
			'getBalance',
			[address, { commitment: 'confirmed' }],
			timeoutMs,
		),
		solanaRpcCall<{ value: ParsedTokenAccount[] }>(
			rpcUrl,
			'getTokenAccountsByOwner',
			[
				address,
				{ programId: SPL_TOKEN_PROGRAM_ID },
				{ encoding: 'jsonParsed', commitment: 'confirmed' },
			],
			timeoutMs,
		),
	]);

	const byMint: Record<string, bigint> = {};
	for (const { account } of tokenAccounts.value) {
		const info = account.data?.parsed?.info;
		const mint = info?.mint;
		const amount = info?.tokenAmount?.amount;
		if (!mint || amount == null) continue;
		byMint[mint] = (byMint[mint] ?? BigInt(0)) + BigInt(amount);
	}

	const filter =
		mintFilter && mintFilter.length > 0 ? new Set(mintFilter) : undefined;

	const tokens: BalanceTokenDto[] = Object.entries(byMint)
		.filter(([mint]) => !filter || filter.has(mint))
		.map(([unit, amount]) => ({
			unit,
			amount: amount.toString(10),
		}));

	if (filter) {
		for (const mint of filter) {
			if (!tokens.some((t) => t.unit === mint)) {
				tokens.push({ unit: mint, amount: '0' });
			}
		}
	}

	return {
		amount: BigInt(balanceResult.value).toString(10),
		tokens,
	};
}
