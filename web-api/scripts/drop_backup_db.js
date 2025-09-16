const dotenv = require('dotenv');
const path = require('path');
const { dropDB, setCWDToScriptsDir } = require('./utils');
const { AppConfigService } = require('../dist/config/config.service');

setCWDToScriptsDir();

dotenv.config({ path: path.join(process.cwd(), '../.env') });
const cfg = new AppConfigService();

const dbConfig = {
	user: process.env.DB_USERNAME,
	host: cfg.db.host,
	port: cfg.db.port,
	database: cfg.db.name,
	password: process.env.DB_PASSWORD,
};

const backupDBName = process.env.DB_NAME + "_backup";

dropDB(dbConfig, backupDBName);