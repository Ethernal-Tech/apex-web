import {
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Ip,
	Post,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import {
	CreateCardanoTransactionResponseDto,
	TransactionSubmittedDto,
	CreateTransactionDto,
	CreateEthTransactionResponseDto,
	CardanoTransactionFeeResponseDto,
	TransactionUpdateDto,
	TransactionActivateDeleteDto,
} from './transaction.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
	createEth(
		@Body() model: CreateTransactionDto,
	): CreateEthTransactionResponseDto {
		return this.transactionService.createEth(model);
	}

	@ApiOperation({
		summary:
			'Save non-active transactions to the database, with desired activation offset',
		description:
			'Returns a non active bridging transaction along with its associated data.',
	})
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
		@Ip() ip: string,
	): Promise<BridgeTransactionDto> {
		return this.transactionService.transactionSubmitted(model, ip);
	}

	@ApiOperation({
		summary:
			'Update the txRaw field in the database transaction and activate it',
		description:
			'Returns a activated bridging transaction along with its associated data.',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		type: BridgeTransactionDto,
		description: 'OK - Returns activated bridging transaction.',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Bad Request - Error while confirming transaction submittion.',
	})
	@HttpCode(HttpStatus.OK)
	@Post('bridgingTransactionUpdate')
	async bridgingTransactionUpdate(
		@Body() model: TransactionUpdateDto,
		@Ip() ip: string,
	): Promise<BridgeTransactionDto> {
		return this.transactionService.updateTransaction(
			model.originChain,
			model.originTxHash,
			ip,
			model.txRaw,
		);
	}

	@ApiOperation({
		summary: 'Delete unconfirmed transaction from database',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Bad Request - Error while confirming transaction submittion.',
	})
	@HttpCode(HttpStatus.OK)
	@Post('bridgingTransactionDelete')
	bridgingTransactionDelete(
		@Body() model: TransactionActivateDeleteDto,
		@Ip() ip: string,
	): void {
		this.transactionService.removeTransaction(model, ip);
	}

	@ApiOperation({
		summary:
			'Save transactions to the database, the transaction is activated immediately',
		description:
			'Returns active bridging transaction along with its associated data.',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		type: BridgeTransactionDto,
		description: 'OK - Returns non-active bridging transaction.',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Bad Request - Error while non-active transaction submittion.',
	})
	@HttpCode(HttpStatus.OK)
	@Post('bridgingTransactionSubmittedActivated')
	async bridgingTransactionSubmittedActivated(
		@Body() model: TransactionSubmittedDto,
		@Ip() ip: string,
	): Promise<BridgeTransactionDto> {
		return this.transactionService.transactionSubmitted(model, ip, true);
	}

	@ApiOperation({
		summary: 'Confirm the bridging transaction submission on the source chain',
		description:
			'Returns a confirmed bridging transaction along with its associated data.',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		type: BridgeTransactionDto,
		description: 'OK - Returns activated bridging transaction.',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Bad Request - Error while confirming transaction submittion.',
	})
	@HttpCode(HttpStatus.OK)
	@Post('bridgingTransactionActivate')
	bridgingTransactionActivate(
		@Body() model: TransactionActivateDeleteDto,
		@Ip() ip: string,
	): Promise<BridgeTransactionDto> {
		return this.transactionService.updateTransaction(
			model.originChain,
			model.originTxHash,
			ip,
		);
	}
}
