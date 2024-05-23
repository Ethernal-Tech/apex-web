import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';

@Module({
	imports: [TypeOrmModule.forFeature([BridgeTransaction])],
	providers: [TransactionService, JwtService],
	controllers: [TransactionController],
})
export class TransactionModule {}
