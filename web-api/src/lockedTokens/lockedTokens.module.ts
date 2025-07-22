import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { LockedTokensService } from './lockedTokens.service';
import { LockedTokensController } from './lockedTokens.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { SettingsModule } from 'src/settings/settings.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([BridgeTransaction]),
		CacheModule.register({ ttl: 30, max: 100 }),
		SettingsModule,
	],
	providers: [LockedTokensService],
	controllers: [LockedTokensController],
})
export class LockedTokensModule {}
