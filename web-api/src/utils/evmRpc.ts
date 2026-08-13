import axios from 'axios';
import { Web3 } from 'web3';

/**
 * Reads against an EVM node, as raw JSON-RPC.
 *
 * The calls are deliberately not made through web3: everything read this way is
 * either a balance or a single-word getter, so spelling out the selector is
 * cheaper than carrying an ABI for it, and it keeps the Solana reader in
 * solanaBalance.helper.ts symmetrical with the EVM one. web3 is still used for
 * address checksumming, which is pure string work.
 */

const RPC_TIMEOUT_MS = 10_000;

export const isEvmAddress = (value: string): boolean =>
	/^0x[0-9a-fA-F]{40}$/.test(value);

/** Validates and EIP-55 checksums an address that arrived as an opaque string. */
export const checksumEvmAddress = (value: string): `0x${string}` => {
	if (!isEvmAddress(value)) {
		throw new Error(`"${value}" is not a 20-byte EVM address`);
	}

	return Web3.utils.toChecksumAddress(value) as `0x${string}`;
};

type JsonRpcResponse = {
	result?: string;
	error?: { code?: number; message?: string };
};

/**
 * An EVM node answers a failed call with HTTP 200 and an `error` body, so the
 * body has to be inspected rather than the status code.
 */
export async function ethCall(
	rpcUrl: string,
	method: string,
	params: unknown[],
): Promise<string> {
	const { data } = await axios.post<JsonRpcResponse>(
		rpcUrl,
		{ jsonrpc: '2.0', id: 1, method, params },
		{
			headers: { 'Content-Type': 'application/json' },
			timeout: RPC_TIMEOUT_MS,
		},
	);

	if (data?.error) {
		throw new Error(
			`${method} failed: ${data.error.message ?? JSON.stringify(data.error)}`,
		);
	}

	if (typeof data?.result !== 'string' || data.result === '0x') {
		// '0x' means the call reverted or there is no contract at that address -
		// an empty answer, not a zero balance.
		throw new Error(
			`${method} returned no data (${data?.result ?? 'undefined'})`,
		);
	}

	return data.result;
}

/**
 * `eth_call` for a getter returning a single `address`, which ABI-encodes as one
 * right-aligned 32-byte word.
 *
 * The zero address is rejected: a getter that has never been wired up answers
 * with it, and taking that at face value would silently produce transactions
 * addressed to nowhere.
 *
 * Returned EIP-55 checksummed, since an ABI word carries no case and these
 * addresses are handed to wallets.
 */
export async function ethCallAddress(
	rpcUrl: string,
	to: string,
	selector: string,
): Promise<`0x${string}`> {
	const result = await ethCall(rpcUrl, 'eth_call', [
		{ to, data: selector },
		'latest',
	]);

	const word = result.slice(2);
	if (word.length !== 64 || !/^0{24}/.test(word)) {
		throw new Error(
			`${to} ${selector} returned ${result}, which is not an ABI-encoded address`,
		);
	}

	const address = `0x${word.slice(24)}` as `0x${string}`;
	if (BigInt(address) === 0n) {
		throw new Error(`${to} ${selector} returned the zero address`);
	}

	return Web3.utils.toChecksumAddress(address) as `0x${string}`;
}
