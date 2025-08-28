import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiResponse, ApiTags, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { SettingsFullResponseDto } from './settings.dto';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
	constructor(private readonly settingsService: SettingsService) {}

	@ApiOperation({
		summary: 'Get bridge settings',
		description:
			'Returns the participating chains with their specific settings, global bridge configuration (such as minimum and maximum allowed bridging amounts), and, for each source chain, the native token that will be received on the destination chain.',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		type: SettingsFullResponseDto,
		description: 'OK - Returns the configuration settings.',
	})
	@HttpCode(HttpStatus.OK)
	@Get()
	async get(): Promise<SettingsFullResponseDto> {
		return this.settingsService.SettingsResponse;
	}
}
