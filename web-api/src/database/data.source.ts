import dotenv from 'dotenv';
import { AppConfigService } from 'src/config/config.service';
import { DataSource, DataSourceOptions } from 'typeorm';

const cfg = new AppConfigService(); // no DI here; just read JSON
// Load env file
dotenv.config({ path: '.env' });

export const dbdatasource: DataSourceOptions = {
	type: 'postgres',
	host: cfg.db.host,
	port: cfg.db.port || 5432,
	username: process.env.DB_USERNAME,
	password: process.env.DB_PASSWORD,
	database: cfg.db.name,
	synchronize: process.env.NODE_ENV === 'development',
	entities: cfg.db.entities,
	ssl: cfg.db.ssl,
	migrations: cfg.db.migrations,
	migrationsTableName: cfg.db.migrationsTableName,
};

const dataSource = new DataSource(dbdatasource);
export default dataSource;
