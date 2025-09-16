// src/config/settings-json.module.ts
import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './config.service';

@Global()
@Module({
	providers: [AppConfigService],
	exports: [AppConfigService],
})
export class AppSettingsModule {}
