const dotenv = require('dotenv');
const path = require('path');
const { dropDB, setCWDToScriptsDir } = require('./utils');
const { getAppConfig } = require('../dist/appConfig/appConfig');

setCWDToScriptsDir();

dotenv.config({ path: path.join(process.cwd(), '../.env') });
const appConfig = getAppConfig();

const dbConfig = {
	user: process.env.DB_USERNAME,
	host: appConfig.db.host,
	port: appConfig.db.port,
	database: appConfig.db.name,
	password: process.env.DB_PASSWORD,
};

const backupDBName = process.env.DB_NAME + "_backup";

dropDB(dbConfig, backupDBName);