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
	CreateTransactionResponseDto,
	SignTransactionDto,
	SubmitTransactionDto,
	SubmitTransactionResponseDto,
	TransactionResponseDto,
	TransactionSubmittedDto,
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
		@AuthUser() user: User,
		@Body() model: CreateTransactionDto,
	): Promise<CreateTransactionResponseDto> {
		model.senderAddress = user.address;
		model.originChain = user.chainId;
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
		@AuthUser() user: User,
		@Body() model: SubmitTransactionDto,
	): Promise<SubmitTransactionResponseDto> {
		model.senderAddress = user.address;
		model.originChain = user.chainId;
		return this.transactionService.submitTransaction(model);
	}

	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Success',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Bad Request',
	})
	@HttpCode(HttpStatus.OK)
	@Post('bridgingTransactionSubmitted')
	async bridgingTransactionSubmitted(
		@AuthUser() user: User,
		@Body() model: TransactionSubmittedDto,
	): Promise<void> {
		model.senderAddress = user.address;
		model.originChain = user.chainId;
		return this.transactionService.transactionSubmitted(model);
	}
}
