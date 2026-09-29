import axios from 'axios';

/**
 * Balance reads against a Solana node, as raw JSON-RPC.
 *
 * web-api has no @solana/web3.js dependency and this needs two read methods,
 * so the SDK would be a large addition for very little.
 */

const RPC_TIMEOUT_MS = 10_000;
const COMMITMENT = 'confirmed';

/** Solana addresses are base58; no `0x`, no fixed length, never `l`/`I`/`O`/`0`. */
export const isSolanaAddress = (value: string): boolean =>
	/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);

type JsonRpcBody<T> = {
	result?: T;
	error?: { code?: number; message?: string };
};

/**
 * Solana answers a failed call with HTTP 200 and an `error` body, so the body
 * has to be inspected rather than the status code.
 *
 * `keepRawBody` returns the untouched response text: `getBalance` reports
 * lamports as a JSON number, which `JSON.parse` would round above 2^53
 * (~9,007,199 SOL), so that one value is pulled out of the raw text instead.
 */
async function solanaRpc<T>(
	rpcUrl: string,
	method: string,
	params: unknown[],
	keepRawBody = false,
): Promise<{ result: T; raw: string }> {
	const response = await axios.post<JsonRpcBody<T> | string>(
		rpcUrl,
		{ jsonrpc: '2.0', id: 1, method, params },
		{
			headers: { 'Content-Type': 'application/json' },
			timeout: RPC_TIMEOUT_MS,
			...(keepRawBody ? { transformResponse: [(body: string) => body] } : {}),
		},
	);

	const raw =
		typeof response.data === 'string'
			? response.data
			: JSON.stringify(response.data);
	const body: JsonRpcBody<T> =
		typeof response.data === 'string'
			? (JSON.parse(response.data) as JsonRpcBody<T>)
			: response.data;

	if (body?.error) {
		throw new Error(
			`${method} failed: ${body.error.message ?? JSON.stringify(body.error)}`,
		);
	}

	if (body?.result === undefined || body?.result === null) {
		throw new Error(`${method} returned no result`);
	}

	return { result: body.result, raw };
}

/** Native SOL held by `owner`, in lamports. */
export async function readSolBalance(
	rpcUrl: string,
	owner: string,
): Promise<bigint> {
	const { raw } = await solanaRpc<{ value: number }>(
		rpcUrl,
		'getBalance',
		[owner, { commitment: COMMITMENT }],
		true,
	);

	// read the integer out of the raw body, before JSON number rounding
	const match = raw.match(/"value"\s*:\s*(\d+)/);
	if (!match) {
		throw new Error('getBalance returned no lamport value');
	}

	return BigInt(match[1]);
}

/**
 * SPL balance of one mint across every token account `owner` holds for it,
 * with the mint's own decimals - so no ATA derivation and no assumed decimals.
 */
export async function readSplBalance(
	rpcUrl: string,
	owner: string,
	mint: string,
): Promise<{ amount: bigint; decimals: number }> {
	type TokenAccounts = {
		value: {
			account: {
				data: {
					parsed: {
						info: { tokenAmount: { amount: string; decimals: number } };
					};
				};
			};
		}[];
	};

	const { result } = await solanaRpc<TokenAccounts>(
		rpcUrl,
		'getTokenAccountsByOwner',
		[owner, { mint }, { encoding: 'jsonParsed', commitment: COMMITMENT }],
	);

	let amount = BigInt(0);
	let decimals: number | undefined;

	for (const entry of result.value ?? []) {
		const tokenAmount = entry?.account?.data?.parsed?.info?.tokenAmount;
		if (!tokenAmount) continue;

		// a string, so large balances survive
		amount += BigInt(tokenAmount.amount || '0');
		decimals ??= tokenAmount.decimals;
	}

	if (decimals === undefined) {
		// no token account for this mint yet: nothing has ever been locked, and
		// the mint's decimals are unknown. 0 in any unit is 0, so 6 is safe.
		return { amount: BigInt(0), decimals: 6 };
	}

	return { amount, decimals };
}
