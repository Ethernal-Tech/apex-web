const dotenv = require('dotenv');
const path = require('path');
const { dropDB, setCWDToScriptsDir } = require('./utils');

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

dropDB(dbConfig, backupDBName);