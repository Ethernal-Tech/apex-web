const dotenv = require('dotenv');
const path = require('path');
const pg = require('pg');
const { setCWDToScriptsDir } = require('./utils');

setCWDToScriptsDir();

dotenv.config({ path: path.join(process.cwd(), '../.env') });

const dbConfig = {
	user: process.env.DB_USERNAME,
	host: process.env.DB_HOST,
	port: process.env.DB_PORT,
	database: process.env.DB_NAME,
	password: process.env.DB_PASSWORD,
};

async function backfillAmountWei() {
	const client = new pg.Client(dbConfig);

	try {
		await client.connect();

		const result = await client.query(`
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

		console.log(`Backfill complete. Updated ${result.rowCount} row(s).`);
	} catch (err) {
		console.error('Error executing query:', err.stack);
	} finally {
		await client.end();
	}
}

backfillAmountWei();
