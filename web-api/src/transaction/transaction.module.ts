import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { JwtService } from '@nestjs/jwt';

@Module({
	providers: [TransactionService, JwtService],
	controllers: [TransactionController],
})
export class TransactionModule {}
