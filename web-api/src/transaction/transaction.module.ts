import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { SettingsModule } from 'src/settings/settings.module';

@Module({
	imports: [TypeOrmModule.forFeature([BridgeTransaction]), SettingsModule],
	providers: [TransactionService],
	controllers: [TransactionController],
})
export class TransactionModule {}
