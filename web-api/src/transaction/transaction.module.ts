import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';

@Module({
	imports: [TypeOrmModule.forFeature([BridgeTransaction])],
	providers: [TransactionService],
	controllers: [TransactionController],
})
export class TransactionModule {}
