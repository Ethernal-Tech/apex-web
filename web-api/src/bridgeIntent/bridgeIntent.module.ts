import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { SettingsModule } from 'src/settings/settings.module';
import { BridgeIntentController } from './bridgeIntent.controller';
import { BridgeIntent } from './bridgeIntent.entity';
import { BridgeIntentService } from './bridgeIntent.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([BridgeIntent, BridgeTransaction]),
		SettingsModule,
	],
	controllers: [BridgeIntentController],
	providers: [BridgeIntentService],
	exports: [BridgeIntentService],
})
export class BridgeIntentModule {}
