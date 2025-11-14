import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { SchedulerRegistry } from '@nestjs/schedule';

const providers = [
	{
		provide: SettingsService,
		inject: [AppConfigService, SchedulerRegistry],
		useFactory: async (
			appConfig: AppConfigService,
			schedulerRegistry: SchedulerRegistry,
		): Promise<SettingsService> => {
			const s = new SettingsService(appConfig, schedulerRegistry);
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
