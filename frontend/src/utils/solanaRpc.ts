import appSettings from '../settings/appSettings';
import {
	SolanaNetworkType,
	SolanaNetworkTypeMap,
} from '../features/Address/types';

type JsonRpcResponse<T> = {
	result?: T;
	error?: { message?: string; code?: number };
};

function getRpcUrl(useMainnet?: boolean): string {
	const isMainnet = useMainnet ?? appSettings.isMainnet;
	const rpcUrl =
		SolanaNetworkTypeMap[
			isMainnet
				? SolanaNetworkType.MainNetNetwork
				: SolanaNetworkType.TestNetNetwork
		];

	if (!rpcUrl) {
		throw new Error('Missing Solana RPC URL for selected network.');
	}

	return rpcUrl;
}

async function solanaRpcCall<T>(
	method: string,
	params: unknown[],
	useMainnet?: boolean,
): Promise<T> {
	const response = await fetch(getRpcUrl(useMainnet), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: 1,
			method,
			params,
		}),
	});

	if (!response.ok) {
		throw new Error(`Solana RPC HTTP ${response.status}`);
	}

	const json = (await response.json()) as JsonRpcResponse<T>;
	if (json.error) {
		throw new Error(json.error.message ?? 'Solana RPC error');
	}

	if (json.result === undefined) {
		throw new Error('Solana RPC returned no result');
	}

	return json.result;
}

export async function getBalanceLamports(
	address: string,
	useMainnet?: boolean,
): Promise<bigint> {
	const result = await solanaRpcCall<{ value: number }>(
		'getBalance',
		[address, { commitment: 'finalized' }],
		useMainnet,
	);
	return BigInt(result.value);
}

const SPL_TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

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

/** One RPC call: all SPL token balances for owner, keyed by mint address. */
export async function getSplTokenBalancesByMintLamports(
	ownerAddress: string,
	useMainnet?: boolean,
): Promise<Record<string, bigint>> {
	const result = await solanaRpcCall<{ value: ParsedTokenAccount[] }>(
		'getTokenAccountsByOwner',
		[
			ownerAddress,
			{ programId: SPL_TOKEN_PROGRAM_ID },
			{ encoding: 'jsonParsed', commitment: 'confirmed' },
		],
		useMainnet,
	);

	const balances: Record<string, bigint> = {};
	for (const { account } of result.value) {
		const info = account.data?.parsed?.info;
		const mint = info?.mint;
		const amount = info?.tokenAmount?.amount;
		if (!mint || !amount) {
			continue;
		}
		const lamports = BigInt(amount);
		balances[mint] = (balances[mint] ?? BigInt(0)) + lamports;
	}

	return balances;
}

export async function getSplTokenBalanceLamports(
	ownerAddress: string,
	mintAddress: string,
	useMainnet?: boolean,
): Promise<bigint> {
	const balances = await getSplTokenBalancesByMintLamports(
		ownerAddress,
		useMainnet,
	);
	return balances[mintAddress] ?? BigInt(0);
}

export async function getFeeForMessageLamports(
	messageBase64: string,
	useMainnet?: boolean,
): Promise<bigint> {
	const result = await solanaRpcCall<{ value: number | null }>(
		'getFeeForMessage',
		[messageBase64, { commitment: 'confirmed' }],
		useMainnet,
	);

	if (result.value == null) {
		throw new Error('Solana fee estimation returned no value.');
	}

	return BigInt(result.value);
}

export async function sendRawTransactionBase64(
	transactionBase64: string,
	useMainnet?: boolean,
): Promise<string> {
	return solanaRpcCall<string>(
		'sendTransaction',
		[
			transactionBase64,
			{
				encoding: 'base64',
				skipPreflight: false,
				preflightCommitment: 'confirmed',
			},
		],
		useMainnet,
	);
}

export async function confirmTransactionSignature(
	signature: string,
	useMainnet?: boolean,
	timeoutMs = 60_000,
): Promise<void> {
	const started = Date.now();

	while (Date.now() - started < timeoutMs) {
		const result = await solanaRpcCall<{
			value: Array<{
				confirmationStatus?: string;
				err: unknown;
			} | null>;
		}>(
			'getSignatureStatuses',
			[[signature], { searchTransactionHistory: true }],
			useMainnet,
		);

		const status = result.value[0];
		if (status?.err) {
			throw new Error(
				`Transaction failed: ${JSON.stringify(status.err)}`,
			);
		}

		if (
			status?.confirmationStatus === 'confirmed' ||
			status?.confirmationStatus === 'finalized'
		) {
			return;
		}

		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	throw new Error('Transaction confirmation timed out');
}
