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
		LockedTokensModule
	],
	controllers: [],
	providers: [],
	exports: [],
})
export class AppModule {}
