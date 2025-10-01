// src/config/settings-json.module.ts
import { Global, Module } from '@nestjs/common';
import { AppSettingsService } from './appSettings.service';

@Global()
@Module({
	providers: [AppSettingsService],
	exports: [AppSettingsService],
})
export class AppSettingsModule {}
