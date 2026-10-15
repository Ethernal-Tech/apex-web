import {
	BadRequestException,
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Post,
} from '@nestjs/common';
import { BridgeTransactionService } from './bridgeTransaction.service';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChainEnum } from 'src/common/enum';
import {
	BridgeTransactionDto,
	BridgeTransactionFilterDto,
	BridgeTransactionResponseDto,
} from './bridgeTransaction.dto';

@ApiTags('BridgeTransaction')
@Controller('bridgeTransaction')
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
		description: 'Success',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Bad Request - unknown origin chain',
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'Not Found - the transaction is not recorded (yet)',
	})
	@HttpCode(HttpStatus.OK)
	@Get('byTxHash/:originChain/:txHash')
	async getByTxHash(
		@Param('originChain') originChain: string,
		@Param('txHash') txHash: string,
	): Promise<BridgeTransactionDto> {
		if (!(Object.values(ChainEnum) as string[]).includes(originChain)) {
			throw new BadRequestException('Invalid originChain');
		}

		return this.bridgeTransactionService.getByTxHash(
			originChain as ChainEnum,
			txHash,
		);
	}

	@ApiResponse({
		status: HttpStatus.OK,
		type: BridgeTransactionResponseDto,
		isArray: false,
		description: 'Success',
	})
	@HttpCode(HttpStatus.OK)
	@Post('filter')
	async getAllFiltered(
		@Body() filter: BridgeTransactionFilterDto,
	): Promise<BridgeTransactionResponseDto> {
		return this.bridgeTransactionService.getAllFiltered(filter);
	}
}
