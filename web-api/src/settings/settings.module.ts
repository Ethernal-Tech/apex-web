import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { SchedulerRegistry } from '@nestjs/schedule';

const providers = [
	{
		provide: SettingsService,
		inject: [SchedulerRegistry, AppConfigService],
		useFactory: async (
			schedulerRegistry: SchedulerRegistry,
			appConfig: AppConfigService,
		): Promise<SettingsService> => {
			const s = new SettingsService(schedulerRegistry, appConfig);
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
