import { Module } from '@nestjs/common';
import { BridgeTransactionController } from './bridgeTransaction.controller';
import { BridgeTransactionService } from './bridgeTransaction.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BridgeTransaction } from './bridgeTransaction.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { SettingsModule } from 'src/settings/settings.module';
import { JobLockModule } from 'src/jobLock/jobLock.module';
@Module({
	imports: [
		TypeOrmModule.forFeature([BridgeTransaction]),
		ScheduleModule.forRoot(),
		SettingsModule,
		JobLockModule,
	],
	controllers: [BridgeTransactionController],
	providers: [BridgeTransactionService],
})
export class BridgeTransactionModule {}
