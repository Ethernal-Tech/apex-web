import dotenv from 'dotenv';
import { getAppConfig } from 'src/appConfig/appConfig';

import { DataSource, DataSourceOptions } from 'typeorm';

// Load env file
dotenv.config({ path: '.env' });

const appConfig = getAppConfig();

export const dbdatasource: DataSourceOptions = {
	type: 'postgres',
	host: appConfig.db.host,
	port: appConfig.db.port,
	username: process.env.DB_USERNAME,
	password: process.env.DB_PASSWORD,
	database: appConfig.db.name,
	synchronize: process.env.NODE_ENV === 'development',
	entities: appConfig.db.entities,
	ssl: appConfig.db.ssl,
	migrations: appConfig.db.migrations,
	migrationsTableName: appConfig.db.migrationsTableName,
};

const dataSource = new DataSource(dbdatasource);
export default dataSource;
