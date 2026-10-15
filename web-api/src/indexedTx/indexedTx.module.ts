import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { IndexerCursor } from './indexerCursor.entity';
import { IndexedTxService } from './indexedTx.service';

@Module({
	imports: [TypeOrmModule.forFeature([BridgeTransaction, IndexerCursor])],
	providers: [IndexedTxService],
})
export class IndexedTxModule {}
