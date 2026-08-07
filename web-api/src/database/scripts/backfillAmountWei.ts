/**
 * Backfill amountWei / tokenAmountWei from chain-native amount / nativeTokenAmount.
 * Run after migration AmountWeiColumns:
 *
 *   npm run backfill:amount-wei
 */
import dataSource from '../data.source';

async function main() {
	await dataSource.initialize();
	const result = await dataSource.query(`
		UPDATE "bridgeTransactions"
		SET
			"amountWei" = CASE
				WHEN "originChain" IN ('prime', 'vector', 'cardano')
					THEN ("amount"::numeric * 1000000000000)
				WHEN "originChain" = 'solana'
					THEN ("amount"::numeric * 1000000000)
				ELSE "amount"::numeric
			END,
			"tokenAmountWei" = CASE
				WHEN "originChain" IN ('prime', 'vector', 'cardano')
					THEN ("nativeTokenAmount"::numeric * 1000000000000)
				WHEN "originChain" = 'solana'
					THEN ("nativeTokenAmount"::numeric * 1000000000)
				ELSE "nativeTokenAmount"::numeric
			END
	`);
	console.log('Backfill complete:', result);
	await dataSource.destroy();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
