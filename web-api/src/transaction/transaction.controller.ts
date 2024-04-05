import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import {
	CreateTransactionDto,
	SignTransactionDto,
	SubmitTransactionDto,
} from './transaction.dto';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Transaction')
@Controller('transaction')
export class TransactionController {
	constructor(private readonly transactionService: TransactionService) {}

	@ApiResponse({
		status: HttpStatus.OK,
		type: String,
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
	): Promise<string> {
		const transaction = await this.transactionService.createTransaction(model);
		return transaction.to_json();
	}

	@ApiResponse({
		status: HttpStatus.OK,
		type: String,
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
	): Promise<string> {
		const transaction = await this.transactionService.signTransaction(model);
		return transaction.to_json();
	}

	@ApiResponse({
		status: HttpStatus.OK,
		type: String,
		description: 'Success',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Not Found',
	})
	@HttpCode(HttpStatus.OK)
	@Post('submitBridgingTransaction')
	async submitBridgingTransaction(
		@Body() model: SubmitTransactionDto,
	): Promise<string> {
		return this.transactionService.submitTransaction(model);
	}
}
