import { Logger } from '@nestjs/common';
import { getAppConfig } from 'src/appConfig/appConfig';
import {
	SolanaNetworkType,
	SolanaNetworkTypeMap,
} from 'src/utils/Address/types';

type JsonRpcResponse<T> = {
	result?: T;
	error?: { message?: string };
};

function getSolanaRpcUrl(): string {
	const isMainnet = getAppConfig().app.isMainnet;
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

async function solanaRpcCall<T>(method: string, params: unknown[]): Promise<T> {
	const response = await fetch(getSolanaRpcUrl(), {
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

/** Returns false when the blockhash has expired and the tx can no longer land. */
export async function isSolanaBlockhashValid(
	blockHash: string,
): Promise<boolean> {
	const result = await solanaRpcCall<{ value: boolean }>('isBlockhashValid', [
		blockHash,
		{ commitment: 'confirmed' },
	]);
	return result.value;
}

export async function isSolanaBlockhashValidSafe(
	blockHash: string,
): Promise<boolean | undefined> {
	try {
		return await isSolanaBlockhashValid(blockHash);
	} catch (e) {
		Logger.warn(`isSolanaBlockhashValid failed for ${blockHash}: ${e}`);
		return undefined;
	}
}

type SignatureStatus = {
	confirmationStatus?: string;
	err: unknown;
} | null;

/** Whether the signature is confirmed/finalized on chain (bridge already landed on source). */
export async function isSolanaTransactionConfirmed(
	signature: string,
): Promise<boolean | undefined> {
	try {
		const result = await solanaRpcCall<{ value: SignatureStatus[] }>(
			'getSignatureStatuses',
			[[signature], { searchTransactionHistory: true }],
		);
		const status = result.value[0];
		if (!status || status.err) {
			return false;
		}
		return (
			status.confirmationStatus === 'confirmed' ||
			status.confirmationStatus === 'finalized'
		);
	} catch (e) {
		Logger.warn(`getSignatureStatuses failed for ${signature}: ${e}`);
		return undefined;
	}
}
