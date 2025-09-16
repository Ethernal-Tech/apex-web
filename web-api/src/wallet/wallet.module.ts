import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { AppSettingsModule } from 'src/config/config.module';

@Module({
	imports: [AppSettingsModule],
	providers: [],
	controllers: [WalletController],
})
export class WalletModule {}
