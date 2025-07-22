import { Body, Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LockedTokensService } from './lockedTokens.service';
import { LockedTokensDto, LockedTokensResponse } from './lockedTokens.dto';

@ApiTags('LockedTokens')
@Controller('lockedTokens')
export class LockedTokensController {
	constructor(private readonly lockedTokensService: LockedTokensService) {}

	@ApiOperation({
		summary: 'Get locked tokens amount',
		description:
			'Provide information to users about the amount of locked tokens',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'OK - Get locked tokens amount.',
		type: LockedTokensDto,
	})
	@HttpCode(HttpStatus.OK)
	@Get()
	async get(): Promise<LockedTokensDto> {
		const chains = (await this.lockedTokensService.getLockedTokens()).chains;
		const totalTransfered = (
			await this.lockedTokensService.sumTransferredTokensPerChain()
		).chains;
		return {
			chains,
			totalTransfered,
		};
	}
}
