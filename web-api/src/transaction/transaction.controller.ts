import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import {
	CreateCardanoTransactionResponseDto,
	TransactionSubmittedDto,
	CreateTransactionDto,
	CreateEthTransactionResponseDto,
	CardanoTransactionFeeResponseDto,
} from './transaction.dto';
import { ApiResponse, ApiTags, ApiOperation } from '@nestjs/swagger';
import { BridgeTransactionDto } from 'src/bridgeTransaction/bridgeTransaction.dto';

@ApiTags('Transaction')
@Controller('transaction')
export class TransactionController {
	constructor(private readonly transactionService: TransactionService) {}

	@ApiOperation({
		summary: 'Create a bridging transaction',
		description:
			'Builds a bridging transaction with all required fees and metadata. The transaction must be signed and submitted separately.',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		type: CreateCardanoTransactionResponseDto,
		description:
			'OK - Returns the raw transaction data, transaction hash, and calculated bridging fee and amounts.',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Bad Request - Error while creating bridging transaction.',
	})
	@ApiResponse({
		status: HttpStatus.INTERNAL_SERVER_ERROR,
		description: 'Internal server Error',
	})
	@HttpCode(HttpStatus.OK)
	@Post('createCardano')
	async createCardano(
		@Body() model: CreateTransactionDto,
	): Promise<CreateCardanoTransactionResponseDto> {
		return await this.transactionService.createCardano(model);
	}

	@ApiOperation({
		summary: 'Get fees required for a bridging transaction',
		description:
			'Returns the transaction and bridging fees that the sender must pay on the source chain. The bridging fee covers the cost for the fee payer to submit the transaction on the destination chain.',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		type: CardanoTransactionFeeResponseDto,
		description: 'OK - Returns calculated fees.',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Bad Request - Error while getting bridging transaction fees.',
	})
	@ApiResponse({
		status: HttpStatus.INTERNAL_SERVER_ERROR,
		description: 'Internal server Error',
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

	@ApiOperation({
		summary: 'Confirm the bridging transaction submission on the source chain',
		description:
			'Returns a confirmed bridging transaction along with its associated data.',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		type: BridgeTransactionDto,
		description: 'OK - Returns confirmed bridging transaction.',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Bad Request - Error while confirming transaction submittion.',
	})
	@HttpCode(HttpStatus.OK)
	@Post('bridgingTransactionSubmitted')
	async bridgingTransactionSubmitted(
		@Body() model: TransactionSubmittedDto,
	): Promise<BridgeTransactionDto> {
		return this.transactionService.transactionSubmitted(model);
	}
}
