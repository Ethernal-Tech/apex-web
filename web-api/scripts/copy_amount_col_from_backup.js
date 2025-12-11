const dotenv = require('dotenv');
const path = require('path');
const pg = require('pg');
const { setCWDToScriptsDir } = require('./utils');
const { getAppConfig } = require('../dist/appConfig/appConfig');

setCWDToScriptsDir();

dotenv.config({ path: path.join(process.cwd(), '../.env') });

const dbConfig = {
	user: process.env.DB_USERNAME,
	host: process.env.DB_HOST,
	port: process.env.DB_PORT,
	database: process.env.DB_NAME,
	password: process.env.DB_PASSWORD,
};

const backupDBName = process.env.DB_NAME + "_backup";

async function update() {
	const client = new pg.Client(dbConfig);
	const backupClient = new pg.Client({ ...dbConfig, database: backupDBName });

	try {
		await client.connect();
		await backupClient.connect();

		const backupResult = await backupClient.query('SELECT "id", "amount" from "bridgeTransactions";')
		let allSuccess = true;

		for (let i = 0; i < backupResult.rows.length; ++i) {
			const row = backupResult.rows[i];
			const updateResult = await client.query(`UPDATE "bridgeTransactions" SET amount = ${row.amount} WHERE "bridgeTransactions".id = ${row.id};`)
			if (updateResult.rowCount !== 1) {
				allSuccess = false;
				console.log('failed to update: ', row)
			}
		}

		allSuccess ? console.log('Values updated successfully!') : console.log('Values updated. Some not successfully');
	} catch (err) {
		console.error('Error executing query:', err.stack);
	} finally {
		await client.end();
		await backupClient.end();
	}
}

update();
