import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { AppConfigService } from 'src/config/config.service';
import { AppSettingsModule } from 'src/config/config.module';

const providers = [
	{
		provide: SettingsService,
		inject: [AppConfigService],
		useFactory: async (cfg: AppConfigService): Promise<SettingsService> => {
			const s = new SettingsService(cfg);
			await s.init();
			return s;
		},
	},
];

@Module({
	imports: [AppSettingsModule],
	providers,
	exports: providers,
	controllers: [SettingsController],
})
export class SettingsModule {}
