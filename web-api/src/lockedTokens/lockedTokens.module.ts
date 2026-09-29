import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { LockedTokensService } from './lockedTokens.service';
import { LockedTokensController } from './lockedTokens.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { SettingsModule } from 'src/settings/settings.module';
import { HistoricalSnapshot } from './historicalSnapshot.entity';
import { MultiChainTvlService } from './multiChainTvl.service';
import { TokenPriceModule } from 'src/tokenPrice/tokenPrice.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([BridgeTransaction, HistoricalSnapshot]),
		// cache-manager v7 TTLs are milliseconds, so this was 30ms - i.e. no cache.
		// `max` is not part of v7's options and was ignored.
		CacheModule.register({ ttl: 30_000 }),
		SettingsModule,
		// the summary prices the locked amounts with the cached token prices
		TokenPriceModule,
	],
	providers: [LockedTokensService, MultiChainTvlService],
	controllers: [LockedTokensController],
	exports: [LockedTokensService],
})
export class LockedTokensModule {}
