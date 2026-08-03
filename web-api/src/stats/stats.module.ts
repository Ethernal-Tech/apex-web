import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
	imports: [TypeOrmModule.forFeature([BridgeTransaction])],
	providers: [StatsService],
	controllers: [StatsController],
})
export class StatsModule {}
