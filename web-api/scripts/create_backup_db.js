const dotenv = require('dotenv');
const path = require('path');
const { runCommand, setCWDToScriptsDir, dropDB } = require('./utils');
const { getAppConfig } = require('../dist/appConfig/appConfig');

setCWDToScriptsDir();

dotenv.config({ path: path.join(process.cwd(), '../.env') });

const appConfig = getAppConfig()

const dbConfig = {
	user: process.env.DB_USERNAME,
	host: appConfig.db.host,
	port: appConfig.db.port,
	database: appConfig.db.name,
	password: process.env.DB_PASSWORD,
};

const backupDBName = process.env.DB_NAME + "_backup";
const dumpFile = `${backupDBName}.sql`;

async function deleteDump() {
	try {
		const deleteDumpFileCommand = `rm ${dumpFile}`;
		await runCommand(deleteDumpFileCommand, 'Removing previous dump file');
	} catch {}
};

async function createBackupDB() {
	try {
		await dropDB(dbConfig, backupDBName);

		const createDbCommand = `PGPASSWORD="${dbConfig.password}" psql --host=${dbConfig.host} --port=${dbConfig.port} --username=${dbConfig.user} ${dbConfig.database} -c "CREATE DATABASE ${backupDBName};"`;
		await runCommand(createDbCommand, 'Creating backup database');

		await deleteDump();

		const dumpCommand = `PGPASSWORD="${dbConfig.password}" pg_dump --host=${dbConfig.host} --port=${dbConfig.port} --username=${dbConfig.user} --clean --if-exists --format=plain --file="${dumpFile}" ${dbConfig.database}`;
		await runCommand(dumpCommand, 'Dumping original database');

		const restoreCommand = `PGPASSWORD="${dbConfig.password}" psql --host=${dbConfig.host} --port=${dbConfig.port} --username=${dbConfig.user} --dbname=${backupDBName} -f "${dumpFile}"`;
		await runCommand(restoreCommand, 'Restoring dump into backup database');

		console.log(`Database backup process completed! ${dbConfig.database} copied to ${backupDBName}.`);
	} catch (error) {
		console.error('Backup process failed:', error);
	} finally {
		await deleteDump();
	}
}

createBackupDB();