import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import {
	CreateCardanoTransactionResponseDto,
	CreateTransactionDto,
	CreateEthTransactionFullResponseDto,
	CardanoTransactionFeeResponseDto,
	CreateSolanaTransactionFullResponseDto,
} from './transaction.dto';
import { ApiResponse, ApiTags, ApiOperation } from '@nestjs/swagger';
import {
	LayerZeroTransferDto as LayerZeroTransferDto,
	LayerZeroTransferResponseDto,
} from './layerzerotransaction.dto';

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

	@ApiOperation({
		summary: 'Create an EVM bridging transaction',
		description:
			'Builds a bridging transaction with all required fees and metadata. The transaction must be signed and submitted separately.',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		type: CreateEthTransactionFullResponseDto,
		description: 'Success',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Bad Request',
	})
	@HttpCode(HttpStatus.OK)
	@Post('createEth')
	createEth(
		@Body() model: CreateTransactionDto,
	): CreateEthTransactionFullResponseDto {
		return this.transactionService.createEth(model);
	}

	@ApiOperation({
		summary: 'Create a Solana bridging transaction',
		description:
			'Builds a bridging transaction with all required fees and metadata. The transaction must be signed and submitted separately.',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		type: CreateSolanaTransactionFullResponseDto,
		description: 'Success',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Bad Request',
	})
	@HttpCode(HttpStatus.OK)
	@Post('createSolana')
	async createSolana(
		@Body() model: CreateTransactionDto,
	): Promise<CreateSolanaTransactionFullResponseDto> {
		return await this.transactionService.createSolana(model);
	}

	@ApiOperation({
		summary: 'Layer Zero transfer proxy call',
		description: 'Layer Zero transfer proxy call',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		type: LayerZeroTransferResponseDto,
		description: 'OK - Returns data recieved from Layer Zero API.',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Bad Request - Error',
	})
	@HttpCode(HttpStatus.OK)
	@Post('layerZeroTransfer')
	async layerZeroTransfer(
		@Body() model: LayerZeroTransferDto,
	): Promise<LayerZeroTransferResponseDto> {
		return this.transactionService.transferLayerZero(model);
	}
}
