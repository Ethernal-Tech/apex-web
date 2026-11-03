import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { SettingsModule } from 'src/settings/settings.module';
import { LayerZeroSyncService } from './layerZeroSync.service';
import { LayerZeroSyncState } from './layerZeroSyncState.entity';

@Module({
	imports: [
		TypeOrmModule.forFeature([BridgeTransaction, LayerZeroSyncState]),
		SettingsModule,
	],
	providers: [LayerZeroSyncService],
})
export class LayerZeroSyncModule {}
