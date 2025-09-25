import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { AppSettingsService } from 'src/appSettings/appSettings.service';

const providers = [
	{
		provide: SettingsService,
		inject: [AppSettingsService],
		useFactory: async (
			appSettings: AppSettingsService,
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
