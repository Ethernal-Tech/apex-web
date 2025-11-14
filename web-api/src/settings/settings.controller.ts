import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { SettingsResponseDto, ValidatorChangeDto } from './settings.dto';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
	constructor(private readonly settingsService: SettingsService) {}

	@ApiResponse({
		status: HttpStatus.OK,
		type: SettingsResponseDto,
		description: 'Success',
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'Not Found',
	})
	@HttpCode(HttpStatus.OK)
	@Get()
	get(): SettingsResponseDto {
		return this.settingsService.SettingsResponse;
	}

	@ApiResponse({
		status: HttpStatus.OK,
		type: ValidatorChangeDto,
	})
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Not Found' })
	@Get('validatorChangeStatus')
	getValidatorChange(): ValidatorChangeDto {
		return { inProgress: this.settingsService.validatorChangeStatus };
	}
}
