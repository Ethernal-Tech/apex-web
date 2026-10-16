import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { SettingsModule } from 'src/settings/settings.module';
import { IndexerCursor } from './indexerCursor.entity';
import { IndexedTxService } from './indexedTx.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([BridgeTransaction, IndexerCursor]),
		SettingsModule,
	],
	providers: [IndexedTxService],
})
export class IndexedTxModule {}
