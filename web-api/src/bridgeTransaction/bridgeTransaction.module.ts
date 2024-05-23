import { Module } from '@nestjs/common';
import { BridgeTransactionController } from './bridgeTransaction.controller';
import { BridgeTransactionService } from './bridgeTransaction.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BridgeTransaction } from './bridgeTransaction.entity';
import { JwtService } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
@Module({
	imports: [
		TypeOrmModule.forFeature([BridgeTransaction]),
		ScheduleModule.forRoot(),
	],
	controllers: [BridgeTransactionController],
	providers: [BridgeTransactionService, JwtService],
})
export class BridgeTransactionModule {}
