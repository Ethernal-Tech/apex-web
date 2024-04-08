import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Post,
	Put,
	UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/guards/auth.guard';
import { BridgeTransactionService } from './bridgeTransaction.service';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import {
	BridgeTransactionDto,
	CreateBridgeTransactionDto,
	UpdateBridgeTransactionDto,
} from './bridgeTransaction.dto';

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
	async get(@Param('id') id: number): Promise<BridgeTransactionDto> {
		return this.bridgeTransactionService.get(id);
	}

	@ApiResponse({
		status: HttpStatus.OK,
		type: BridgeTransactionDto,
		isArray: true,
		description: 'Success',
	})
	@HttpCode(HttpStatus.OK)
	@Get()
	async getAll(): Promise<BridgeTransactionDto[]> {
		return this.bridgeTransactionService.getAll();
	}

	@ApiResponse({
		status: HttpStatus.OK,
		type: BridgeTransactionDto,
		description: 'Success',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Bad Request',
	})
	@HttpCode(HttpStatus.OK)
	@Post()
	async create(
		@Body() model: CreateBridgeTransactionDto,
	): Promise<BridgeTransactionDto> {
		return this.bridgeTransactionService.create(model);
	}

	@ApiResponse({
		status: HttpStatus.OK,
		type: BridgeTransactionDto,
		description: 'Success',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Bad Request',
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'Not Found',
	})
	@HttpCode(HttpStatus.OK)
	@Put()
	async update(
		@Body() model: UpdateBridgeTransactionDto,
	): Promise<BridgeTransactionDto> {
		return this.bridgeTransactionService.update(model);
	}
}
