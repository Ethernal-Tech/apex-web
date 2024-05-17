import {
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Post,
	UseGuards,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import {
	CreateTransactionDto,
	SignTransactionDto,
	SubmitTransactionDto,
} from './transaction.dto';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { User } from 'src/auth/auth.entity';
import { AuthUser } from 'src/decorators/authUser.decorator';

@ApiTags('Transaction')
@Controller('transaction')
@UseGuards(AuthGuard)
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
		@AuthUser() user: User,
		@Body() model: CreateTransactionDto,
	): Promise<string> {
		model.senderAddress = user.address;
		model.originChain = user.chainID;
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
		description: 'Bad Request',
	})
	@HttpCode(HttpStatus.OK)
	@Post('submitBridgingTransaction')
	async submitBridgingTransaction(
		@AuthUser() user: User,
		@Body() model: SubmitTransactionDto,
	): Promise<string> {
		model.chain = user.chainID;
		return this.transactionService.submitTransaction(model);
	}
}
