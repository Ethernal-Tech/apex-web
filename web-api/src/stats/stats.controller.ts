import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { BridgingDurationsDto } from './stats.dto';

@ApiTags('Stats')
@Controller('stats')
export class StatsController {
	constructor(private readonly statsService: StatsService) {}

	@ApiOperation({
		summary: 'Get bridging durations per direction',
		description:
			'Returns how long bridging takes per direction (median and 90th percentile), measured from recently finished bridging transactions.',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'OK - Bridging durations.',
		type: BridgingDurationsDto,
	})
	@HttpCode(HttpStatus.OK)
	@Get('bridgingDurations')
	async getBridgingDurations(): Promise<BridgingDurationsDto> {
		return await this.statsService.getBridgingDurations();
	}
}
