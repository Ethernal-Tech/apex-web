import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { JobLockModule } from 'src/jobLock/jobLock.module';
import { SettingsModule } from 'src/settings/settings.module';
import { OracleSyncService } from './oracleSync.service';
import { OracleSyncState } from './oracleSyncState.entity';

// ScheduleModule.forRoot() is global and registered in BridgeTransactionModule, so the @Cron here
// is picked up without importing it. AppConfigModule is global too.
@Module({
	imports: [
		TypeOrmModule.forFeature([BridgeTransaction, OracleSyncState]),
		SettingsModule,
		JobLockModule,
	],
	providers: [OracleSyncService],
	exports: [OracleSyncService],
})
export class OracleSyncModule {}
