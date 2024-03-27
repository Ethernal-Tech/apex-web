import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './transaction.dto';
import { ApiResponse } from '@nestjs/swagger';

@Controller('transaction')
export class TransactionController {
	constructor(private readonly transactionService: TransactionService) {}

	@ApiResponse({
		status: HttpStatus.OK,
		type: String,
		description: 'Created',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		// type: CreateTransactionDto,
		description: 'Not Found',
	})
	@HttpCode(HttpStatus.OK)
	@Post('createBridgingTransaction')
	async createBridgingTransaction(
		@Body() model: CreateTransactionDto,
	): Promise<string> {
		const transaction = await this.transactionService.createTransaction(model);
		return transaction.to_json();
	}
}
