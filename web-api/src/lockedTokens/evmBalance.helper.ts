import { ethCall } from 'src/utils/evmRpc';

/** Balance reads against an EVM node. The JSON-RPC layer is in utils/evmRpc.ts. */

/** `balanceOf(address)` and `decimals()` selectors. */
const BALANCE_OF_SELECTOR = '0x70a08231';
const DECIMALS_SELECTOR = '0x313ce567';

/** Native currency held by `holder`, in wei. */
export async function readEvmCurrencyBalance(
	rpcUrl: string,
	holder: string,
): Promise<bigint> {
	return BigInt(await ethCall(rpcUrl, 'eth_getBalance', [holder, 'latest']));
}

/** ERC-20 `balanceOf(holder)`, in the token's own smallest unit. */
export async function readErc20Balance(
	rpcUrl: string,
	tokenAddress: string,
	holder: string,
): Promise<bigint> {
	const data =
		BALANCE_OF_SELECTOR + holder.slice(2).toLowerCase().padStart(64, '0');

	return BigInt(
		await ethCall(rpcUrl, 'eth_call', [{ to: tokenAddress, data }, 'latest']),
	);
}

/** ERC-20 `decimals()`. */
export async function readErc20Decimals(
	rpcUrl: string,
	tokenAddress: string,
): Promise<number> {
	const result = await ethCall(rpcUrl, 'eth_call', [
		{ to: tokenAddress, data: DECIMALS_SELECTOR },
		'latest',
	]);

	const decimals = Number(BigInt(result));
	if (!Number.isInteger(decimals) || decimals < 0 || decimals > 77) {
		throw new Error(`${tokenAddress} reported implausible decimals: ${result}`);
	}

	return decimals;
}
