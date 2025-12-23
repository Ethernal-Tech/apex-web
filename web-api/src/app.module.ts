import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TransactionModule } from './transaction/transaction.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dbdatasource } from './database/data.source';
import { BridgeTransactionModule } from './bridgeTransaction/bridgeTransaction.module';
import { SettingsModule } from './settings/settings.module';
import { ContactModule } from './contact/contact.module';
import { MailerConfigModule } from './mailer/mailer.module';
import { LockedTokensModule } from './lockedTokens/lockedTokens.module';
import { AppConfigModule } from './appConfig/appConfig.module';
import { APP_GUARD } from '@nestjs/core';
import { ApiKeyGuard } from './common/guards/api-key.guard';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		TypeOrmModule.forRoot(dbdatasource),
		MailerConfigModule,
		SettingsModule,
		TransactionModule,
		BridgeTransactionModule,
		ContactModule,
		LockedTokensModule,
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
