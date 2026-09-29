import { Module } from '@nestjs/common';
import { BalanceController } from './balance.controller';
import { BalanceService } from './balance.service';

@Module({
	imports: [],
	providers: [BalanceService],
	controllers: [BalanceController],
	exports: [BalanceService],
})
export class BalanceModule {}
