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

async function removeRedudantEntries() {
    const client = new pg.Client(dbConfig);

    try {
        await client.connect();

        const deleteQuery = `
            DELETE t1
            FROM "bridgeTransactions" t1
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