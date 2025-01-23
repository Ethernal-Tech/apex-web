import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// import { TransactionModule } from './transaction/transaction.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dbdatasource } from './database/data.source';
// import { BridgeTransactionModule } from './bridgeTransaction/bridgeTransaction.module';
// import { WalletModule } from './wallet/wallet.module';
// import { SettingsModule } from './settings/settings.module';
import { ContactModule } from './contact/contact.module';
import { MailerConfigModule } from './mailer/mailer.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		TypeOrmModule.forRoot(dbdatasource),
		MailerConfigModule,
		// SettingsModule,
		// TransactionModule,
		// BridgeTransactionModule,
		// WalletModule,
		ContactModule,
	],
	controllers: [],
	providers: [],
	exports: [],
})
export class AppModule {}
