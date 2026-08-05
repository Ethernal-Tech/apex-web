import { Module } from '@nestjs/common';
import { SettingsModule } from 'src/settings/settings.module';
import { CoinGeckoPriceProvider } from './providers/coingecko.provider';
import { DefiLlamaPriceProvider } from './providers/defillama.provider';
import { TokenPriceController } from './tokenPrice.controller';
import { TokenPriceService } from './tokenPrice.service';
import { TrackedTokensRegistry } from './trackedTokens.registry';

@Module({
	imports: [SettingsModule],
	providers: [
		CoinGeckoPriceProvider,
		DefiLlamaPriceProvider,
		TrackedTokensRegistry,
		TokenPriceService,
	],
	controllers: [TokenPriceController],
	exports: [TokenPriceService],
})
export class TokenPriceModule {}
