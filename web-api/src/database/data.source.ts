import dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

// Load env file
dotenv.config({ path: '.env' });

export const dbdatasource: DataSourceOptions = {
	type: 'postgres',
	host: process.env.DB_HOST,
	port: parseInt(process.env.DB_PORT || '5432'),
	username: process.env.DB_USERNAME,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	synchronize: process.env.NODE_ENV === 'development',
	entities: ['dist/**/*.entity.js'],
	ssl: process.env.DB_SSL === 'true',
	migrations: ['dist/database/migrations/*.js'],
	migrationsTableName: '__apex_migrations',
};

const dataSource = new DataSource(dbdatasource);
export default dataSource;
