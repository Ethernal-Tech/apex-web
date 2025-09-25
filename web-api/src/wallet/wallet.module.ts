import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';

@Module({
	imports: [],
	providers: [],
	controllers: [WalletController],
})
export class WalletModule {}
