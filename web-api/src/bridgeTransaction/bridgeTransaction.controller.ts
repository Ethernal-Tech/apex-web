import {
	BadRequestException,
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Post,
} from '@nestjs/common';
import { BridgeTransactionService } from './bridgeTransaction.service';
import { ApiResponse, ApiTags, ApiOperation } from '@nestjs/swagger';
import {
	BridgeTransactionDto,
	BridgeTransactionFilterDto,
	BridgeTransactionResponseDto,
} from './bridgeTransaction.dto';

/** Postgres `integer` max — `bridgeTransactions.id` is an int4 PK. */
const PG_INT4_MAX = 2_147_483_647;

@ApiTags('BridgeTransaction')
@Controller('bridgeTransaction')
export class BridgeTransactionController {
	constructor(
		private readonly bridgeTransactionService: BridgeTransactionService,
	) {}

	@ApiOperation({
		summary: 'Get the bridging transaction details',
		description:
			'Returns information about bridging transaction based on the given ID.',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		type: BridgeTransactionDto,
		description: 'OK - Returns bridging transaction.',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Bad Request - id is not a positive 32-bit integer.',
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'Not Found - Bridging transaction not found.',
	})
	@HttpCode(HttpStatus.OK)
	@Get(':id')
	async get(@Param('id') id: string): Promise<BridgeTransactionDto> {
		const n = Number(id);
		if (!Number.isInteger(n) || n < 1 || n > PG_INT4_MAX) {
			throw new BadRequestException('Invalid id');
		}
		return this.bridgeTransactionService.get(n);
	}

	@ApiOperation({
		summary: 'Get multiple bridging transactions with filtering and pagination',
		description:
			'Returns a paginated list of bridging transactions based on specified filters. Results are sorted by transaction creation date in descending order by default.',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		type: BridgeTransactionResponseDto,
		isArray: false,
		description: 'OK - Returns bridging transactions.',
	})
	@HttpCode(HttpStatus.OK)
	@Post('filter')
	async getAllFiltered(
		@Body() filter: BridgeTransactionFilterDto,
	): Promise<BridgeTransactionResponseDto> {
		return this.bridgeTransactionService.getAllFiltered(filter);
	}
}
