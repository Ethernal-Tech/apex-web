import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { BridgingSettingsDto } from './settings.dto';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
	constructor(private readonly settingsService: SettingsService) {}

	@ApiResponse({
		status: HttpStatus.OK,
		type: BridgingSettingsDto,
		description: 'Success',
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'Not Found',
	})
	@HttpCode(HttpStatus.OK)
	@Get()
	async get(): Promise<BridgingSettingsDto> {
		return this.settingsService.BridgingSettings;
	}
}
