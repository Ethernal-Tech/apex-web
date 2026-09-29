import { BadRequestException, Logger } from '@nestjs/common';
import Web3 from 'web3';
import { BalanceTokenDto } from './balance.dto';

const ERC20_BALANCE_ABI = [
	{
		constant: true,
		inputs: [{ name: '_owner', type: 'address' }],
		name: 'balanceOf',
		outputs: [{ name: 'balance', type: 'uint256' }],
		type: 'function',
	},
] as const;

export async function fetchEvmAddressBalance(
	rpcUrl: string,
	address: string,
	tokenAddresses: string[],
	_timeoutMs: number,
): Promise<{ amount: string; tokens: BalanceTokenDto[] }> {
	const web3 = new Web3(rpcUrl);

	try {
		Logger.debug(`evm getBalance: ${address} via ${rpcUrl}`);
		const nativeWei = await web3.eth.getBalance(address);
		const amount = nativeWei.toString();

		const tokens: BalanceTokenDto[] = [];
		for (const tokenAddress of tokenAddresses) {
			try {
				const contract = new web3.eth.Contract(
					ERC20_BALANCE_ABI as any,
					tokenAddress,
				);
				const raw = await contract.methods.balanceOf(address).call();
				const value = Array.isArray(raw) ? raw[0] : raw;
				tokens.push({
					unit: tokenAddress,
					amount: BigInt(value as any).toString(10),
				});
			} catch (e) {
				Logger.warn(
					`Failed ERC-20 balanceOf for ${tokenAddress}: ${String(e)}`,
				);
				tokens.push({ unit: tokenAddress, amount: '0' });
			}
		}

		return { amount, tokens };
	} catch (e) {
		throw new BadRequestException(
			`Failed to fetch EVM balance: ${e instanceof Error ? e.message : String(e)}`,
		);
	}
}
