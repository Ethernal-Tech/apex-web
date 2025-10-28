import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { AppConfigService } from 'src/appConfig/appConfig.service';

const providers = [
	{
		provide: SettingsService,
		inject: [AppConfigService],
		useFactory: async (
			appSettings: AppConfigService,
		): Promise<SettingsService> => {
			const s = new SettingsService(appSettings);
			await s.init();
			return s;
		},
	},
];

@Module({
	imports: [],
	providers,
	exports: providers,
	controllers: [SettingsController],
})
export class SettingsModule {}
