import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { SchedulerRegistry } from '@nestjs/schedule';

const providers = [
	{
		provide: SettingsService,
		inject: [SchedulerRegistry],
		useFactory: async (
			schedulerRegistry: SchedulerRegistry,
		): Promise<SettingsService> => {
			const s = new SettingsService(schedulerRegistry);
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
