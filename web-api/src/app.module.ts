import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TransactionModule } from './transaction/transaction.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dbdatasource } from './database/data.source';
import { BridgeTransactionModule } from './bridgeTransaction/bridgeTransaction.module';
import { SettingsModule } from './settings/settings.module';
import { MailerConfigModule } from './mailer/mailer.module';
import { ContactModule } from './contact/contact.module';
import { AppConfigModule } from './appConfig/appConfig.module';
import { IndexedTxModule } from './indexedTx/indexedTx.module';
import { APP_GUARD } from '@nestjs/core';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { getAppConfig } from './appConfig/appConfig';

@Module({
	imports: [
		TypeOrmModule.forRoot({
			...dbdatasource,
			// only for the app connection, migrations run through dbdatasource without a limit
			extra: {
				statement_timeout: getAppConfig().db.statementTimeoutMs,
			},
		}),
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		MailerConfigModule,
		SettingsModule,
		TransactionModule,
		BridgeTransactionModule,
		ContactModule,
		IndexedTxModule,
		AppConfigModule,
	],
	controllers: [],
	providers: [
		{
			provide: APP_GUARD,
			useClass: ApiKeyGuard,
		},
	],
	exports: [],
})
export class AppModule {}
