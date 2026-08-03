import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { LandingStatsDto } from './stats.dto';

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
}
