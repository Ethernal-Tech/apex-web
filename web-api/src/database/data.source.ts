import dotenv from 'dotenv';
import { getAppConfig } from 'src/appConfig/appConfig';

import { DataSource, DataSourceOptions } from 'typeorm';

// Load env file
dotenv.config({ path: '.env' });

const appSettings = getAppConfig();

export const dbdatasource: DataSourceOptions = {
	type: 'postgres',
	host: appSettings.db.host,
	port: appSettings.db.port,
	username: process.env.DB_USERNAME,
	password: process.env.DB_PASSWORD,
	database: appSettings.db.name,
	synchronize: process.env.NODE_ENV === 'development',
	entities: appSettings.db.entities,
	ssl: appSettings.db.ssl,
	migrations: appSettings.db.migrations,
	migrationsTableName: appSettings.db.migrationsTableName,
};

const dataSource = new DataSource(dbdatasource);
export default dataSource;
