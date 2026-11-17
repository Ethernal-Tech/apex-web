import { Module } from '@nestjs/common';
import { BridgeIntentModule } from 'src/bridgeIntent/bridgeIntent.module';
import { SettingsModule } from 'src/settings/settings.module';
import { TokenInfoModule } from 'src/tokenInfo/tokenInfo.module';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';

@Module({
	imports: [BridgeIntentModule, SettingsModule, TokenInfoModule],
	controllers: [McpController],
	providers: [McpService],
})
export class McpModule {}
