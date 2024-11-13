import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

const providers = [
	{
		provide: SettingsService,
		useFactory: async (): Promise<SettingsService> => {
			const s = new SettingsService();
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
