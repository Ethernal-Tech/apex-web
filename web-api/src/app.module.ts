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
import { StatsModule } from './stats/stats.module';
import { TokenPriceModule } from './tokenPrice/tokenPrice.module';
import { TokenInfoModule } from './tokenInfo/tokenInfo.module';
import { ChainInfoModule } from './chainInfo/chainInfo.module';
import { BalanceModule } from './balance/balance.module';
import { IndexedTxModule } from './indexedTx/indexedTx.module';
import { LayerZeroSyncModule } from './layerZeroSync/layerZeroSync.module';
import { APP_GUARD } from '@nestjs/core';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { getAppConfig } from './appConfig/appConfig';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		TypeOrmModule.forRoot({
			...dbdatasource,
			// only for the app connection, migrations run through dbdatasource without a limit
			extra: {
				statement_timeout: getAppConfig().db.statementTimeoutMs,
			},
		}),
		MailerConfigModule,
		SettingsModule,
		TransactionModule,
		BridgeTransactionModule,
		ContactModule,
		LockedTokensModule,
		StatsModule,
		TokenPriceModule,
		TokenInfoModule,
		ChainInfoModule,
		BalanceModule,
		IndexedTxModule,
		// LayerZero has no testnet, so its transfers are recorded only by mainnet instances
		...(getAppConfig().app.isMainnet ? [LayerZeroSyncModule] : []),
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
