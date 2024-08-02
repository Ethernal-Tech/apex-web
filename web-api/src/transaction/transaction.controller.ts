import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Post,
	Query,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import {
	CreateTransactionDto,
	CreateTransactionResponseDto,
	ProtocolParamsResponseDto,
	SignTransactionDto,
	SubmitTransactionDto,
	SubmitTransactionResponseDto,
	TransactionResponseDto,
	TransactionSubmittedDto,
} from './transaction.dto';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChainEnum } from 'src/common/enum';
import { BridgeTransactionDto } from 'src/bridgeTransaction/bridgeTransaction.dto';

@ApiTags('Transaction')
@Controller('transaction')
export class TransactionController {
	constructor(private readonly transactionService: TransactionService) {}

	@ApiResponse({
		status: HttpStatus.OK,
		type: CreateTransactionResponseDto,
		description: 'Success',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Bad Request',
	})
	@HttpCode(HttpStatus.OK)
	@Post('createBridgingTransaction')
	async createBridgingTransaction(
		@Body() model: CreateTransactionDto,
	): Promise<CreateTransactionResponseDto> {
		return await this.transactionService.createTransaction(model);
	}

	@ApiResponse({
		status: HttpStatus.OK,
		type: TransactionResponseDto,
		description: 'Success',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Not Found',
	})
	@HttpCode(HttpStatus.OK)
	@Post('signBridgingTransaction')
	async signBridgingTransaction(
		@Body() model: SignTransactionDto,
	): Promise<TransactionResponseDto> {
		return await this.transactionService.signTransaction(model);
	}

	@ApiResponse({
		status: HttpStatus.OK,
		type: SubmitTransactionResponseDto,
		description: 'Success',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Bad Request',
	})
	@HttpCode(HttpStatus.OK)
	@Post('submitBridgingTransaction')
	async submitBridgingTransaction(
		@Body() model: SubmitTransactionDto,
	): Promise<SubmitTransactionResponseDto> {
		return this.transactionService.submitTransaction(model);
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
	@Post('bridgingTransactionSubmitted')
	async bridgingTransactionSubmitted(
		@Body() model: TransactionSubmittedDto,
	): Promise<BridgeTransactionDto> {
		return this.transactionService.transactionSubmitted(model);
	}
	@ApiResponse({
		status: HttpStatus.OK,
		type: ProtocolParamsResponseDto,
		description: 'Success',
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'Not Found',
	})
	@HttpCode(HttpStatus.OK)
	@Get('getProtocolParams')
	async getProtocolParams(
		@Query('chain') chain: ChainEnum,
	): Promise<ProtocolParamsResponseDto> {
		return this.transactionService.getProtocolParams(chain);
	}
}
