import { EmptyRpcResultError, ethCall } from 'src/utils/evmRpc';

/**
 * `decimalConversionRate()`, what an OFT multiplies a shared decimal amount by to
 * get one in its own local decimals - 10^(localDecimals - sharedDecimals).
 */
const DECIMAL_CONVERSION_RATE_SELECTOR = '0x963efcaa';

/**
 * What an OFT of the usual 18 local over 6 shared decimals converts by, which
 * every OFT in this bridge does. Stood in when the real one cannot be read, so a
 * node that cannot answer for the contract does not hold up the import.
 */
export const DEFAULT_DECIMAL_CONVERSION_RATE = BigInt(10) ** BigInt(12);

/**
 * The factor between the amount LayerZero carries in a message and the amount the
 * OFT moved on chain.
 *
 * It is fixed for a deployment, so it is read once per chain and kept. Reading it
 * rather than taking the default above on faith is what keeps the imported
 * amounts exact; the call is a plain getter, no archive node needed.
 */
export const readDecimalConversionRate = async (
	rpcUrl: string,
	oftAddress: string,
): Promise<bigint> => {
	const rate = BigInt(
		await ethCall(rpcUrl, 'eth_call', [
			{ to: oftAddress, data: DECIMAL_CONVERSION_RATE_SELECTOR },
			'latest',
		]),
	);

	if (rate <= BigInt(0)) {
		// as good as no contract there, and as permanent
		throw new EmptyRpcResultError(
			`${oftAddress} reported a decimal conversion rate of ${rate}`,
		);
	}

	return rate;
};
