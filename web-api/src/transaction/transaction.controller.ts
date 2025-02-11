import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import {
	CreateCardanoTransactionResponseDto,
	TransactionSubmittedDto,
	CreateTransactionDto,
	CreateEthTransactionResponseDto,
	CardanoTransactionFeeResponseDto,
} from './transaction.dto';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { BridgeTransactionDto } from 'src/bridgeTransaction/bridgeTransaction.dto';

@ApiTags('Transaction')
@Controller('transaction')
export class TransactionController {
	constructor(private readonly transactionService: TransactionService) {}

	@ApiResponse({
		status: HttpStatus.OK,
		type: CreateCardanoTransactionResponseDto,
		description: 'Success',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Bad Request',
	})
	@HttpCode(HttpStatus.OK)
	@Post('createCardano')
	async createCardano(
		@Body() model: CreateTransactionDto,
	): Promise<CreateCardanoTransactionResponseDto> {
		return await this.transactionService.createCardano(model);
	}

	@ApiResponse({
		status: HttpStatus.OK,
		type: CardanoTransactionFeeResponseDto,
		description: 'Success',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Bad Request',
	})
	@HttpCode(HttpStatus.OK)
	@Post('getCardanoTxFee')
	async getCardanoTxFee(
		@Body() model: CreateTransactionDto,
	): Promise<CardanoTransactionFeeResponseDto> {
		return await this.transactionService.getCardanoTxFee(model);
	}

	@ApiResponse({
		status: HttpStatus.OK,
		type: CreateEthTransactionResponseDto,
		description: 'Success',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Bad Request',
	})
	@HttpCode(HttpStatus.OK)
	@Post('createEth')
	async createEth(
		@Body() model: CreateTransactionDto,
	): Promise<CreateEthTransactionResponseDto> {
		return await this.transactionService.createEth(model);
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
}
