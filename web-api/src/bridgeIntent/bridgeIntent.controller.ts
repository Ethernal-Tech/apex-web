import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BridgeIntentService } from './bridgeIntent.service';
import { BridgeIntentDto, SubmitBridgeIntentDto } from './bridgeIntent.dto';

@ApiTags('BridgeIntent')
@Controller('bridgeIntent')
export class BridgeIntentController {
	constructor(private readonly bridgeIntentService: BridgeIntentService) {}

	@ApiOperation({
		summary: 'Get a bridge intent',
		description:
			'Returns a bridging transfer prepared on behalf of the user (e.g. by an AI agent through MCP), for the user to review and sign.',
	})
	@ApiResponse({ status: HttpStatus.OK, type: BridgeIntentDto })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Not Found' })
	@HttpCode(HttpStatus.OK)
	@Get(':id')
	get(@Param('id') id: string): Promise<BridgeIntentDto> {
		return this.bridgeIntentService.get(id);
	}

	@ApiOperation({
		summary: 'Record the signed transaction of a bridge intent',
		description:
			'Called once the user signed the intent and the tx was submitted to the source chain, so that the intent status can follow the bridging transaction.',
	})
	@ApiResponse({ status: HttpStatus.OK, type: BridgeIntentDto })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Not Found' })
	@ApiResponse({
		status: HttpStatus.CONFLICT,
		description: 'Conflict - a different tx was already recorded',
	})
	@HttpCode(HttpStatus.OK)
	@Post(':id/submit')
	submit(
		@Param('id') id: string,
		@Body() model: SubmitBridgeIntentDto,
	): Promise<BridgeIntentDto> {
		return this.bridgeIntentService.submit(id, model.txHash);
	}
}
