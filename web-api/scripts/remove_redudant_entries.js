const dotenv = require('dotenv');
const path = require('path');
const pg = require('pg');
const { setCWDToScriptsDir } = require('./utils');
const { AppConfigService } = require('../dist/config/config.service');

setCWDToScriptsDir();

dotenv.config({ path: path.join(process.cwd(), '../.env') });

const appSettings = new AppConfigService()

const dbConfig = {
	user: process.env.DB_USERNAME,
	host: appSettings.db.host,
	port: appSettings.db.port,
	database: appSettings.db.name,
	password: process.env.DB_PASSWORD,
};

async function removeRedudantEntries() {
    const client = new pg.Client(dbConfig);

    try {
        await client.connect();

        const deleteQuery = `
            DELETE FROM "bridgeTransactions" t1
            USING "bridgeTransactions" t2
            WHERE t1."sourceTxHash" = t2."sourceTxHash"
            AND t1."id" > t2."id";
        `

        const result = await client.query(deleteQuery);
    } catch (err) {
        console.error('Error executing query:', err.stack);
    } finally {
        await client.end();
    }
}

removeRedudantEntries();