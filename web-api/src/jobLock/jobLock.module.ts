import { Module } from '@nestjs/common';
import { JobLockService } from './jobLock.service';

// Nest caches module instances, so the modules importing this one share a single lock.
// SchedulerRegistry comes from ScheduleModule.forRoot(), which is global and registered in
// BridgeTransactionModule.
@Module({
	providers: [JobLockService],
	exports: [JobLockService],
})
export class JobLockModule {}
