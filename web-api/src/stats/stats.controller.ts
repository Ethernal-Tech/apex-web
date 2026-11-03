import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { BridgingDurationsDto, LandingStatsDto } from './stats.dto';

@ApiTags('Stats')
@Controller('stats')
export class StatsController {
	constructor(private readonly statsService: StatsService) {}

	@ApiOperation({
		summary: 'Get landing page stats',
		description: 'Returns the total number of bridging transactions.',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'OK - Landing page stats.',
		type: LandingStatsDto,
	})
	@HttpCode(HttpStatus.OK)
	@Get()
	async getLandingStats(): Promise<LandingStatsDto> {
		return await this.statsService.getLandingStats();
	}

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
