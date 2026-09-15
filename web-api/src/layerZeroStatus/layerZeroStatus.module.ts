import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { JobLockModule } from 'src/jobLock/jobLock.module';
import { SettingsModule } from 'src/settings/settings.module';
import { LayerZeroStatusService } from './layerZeroStatus.service';
import { LayerZeroSyncState } from './layerZeroSyncState.entity';

// ScheduleModule.forRoot() is global and registered in BridgeTransactionModule, so the @Cron here
// is picked up without importing it. AppConfigModule is global too.
@Module({
	imports: [
		TypeOrmModule.forFeature([BridgeTransaction, LayerZeroSyncState]),
		SettingsModule,
		JobLockModule,
	],
	providers: [LayerZeroStatusService],
	exports: [LayerZeroStatusService],
})
export class LayerZeroStatusModule {}
