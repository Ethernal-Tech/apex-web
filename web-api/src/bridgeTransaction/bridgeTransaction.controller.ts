import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Post,
	UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/guards/auth.guard';
import { BridgeTransactionService } from './bridgeTransaction.service';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import {
	BridgeTransactionDto,
	BridgeTransactionFilterDto,
	BridgeTransactionResponseDto,
} from './bridgeTransaction.dto';
import { AuthUser } from 'src/decorators/authUser.decorator';
import { User } from 'src/auth/auth.entity';

@ApiTags('BridgeTransaction')
@Controller('bridgeTransaction')
@UseGuards(AuthGuard)
export class BridgeTransactionController {
	constructor(
		private readonly bridgeTransactionService: BridgeTransactionService,
	) {}

	@ApiResponse({
		status: HttpStatus.OK,
		type: BridgeTransactionDto,
		description: 'Success',
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'Not Found',
	})
	@HttpCode(HttpStatus.OK)
	@Get(':id')
	async get(
		@Param('id') id: number,
		@AuthUser() user: User,
	): Promise<BridgeTransactionDto> {
		return this.bridgeTransactionService.get(id, user.chainID);
	}

	@ApiResponse({
		status: HttpStatus.OK,
		type: BridgeTransactionResponseDto,
		isArray: false,
		description: 'Success',
	})
	@HttpCode(HttpStatus.OK)
	@Post('filter')
	async getAllFiltered(
		@Body() filter: BridgeTransactionFilterDto,
		@AuthUser() user: User,
	): Promise<BridgeTransactionResponseDto> {
		filter.senderAddress = user.address;
		filter.originChain = user.chainID;
		return this.bridgeTransactionService.getAllFiltered(filter);
	}
}
