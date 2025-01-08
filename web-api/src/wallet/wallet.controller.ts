import {
	BadRequestException,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Logger,
	Query,
} from '@nestjs/common';
import { BalanceResponseDto } from './wallet.dto';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import axios, { AxiosError } from 'axios';
import { ErrorResponseDto } from 'src/transaction/transaction.dto';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
	constructor() {}

	@ApiResponse({
		status: HttpStatus.OK,
		type: BalanceResponseDto,
		description: 'Success',
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'Not Found',
	})
	@HttpCode(HttpStatus.OK)
	@Get('getBalance')
	async getBalance(
		@Query('chain') chain: string,
		@Query('address') address: string,
	): Promise<BalanceResponseDto> {
		const apiUrl = process.env.CARDANO_API_URL || 'http://localhost:40000';
		const apiKey = process.env.CARDANO_API_API_KEY || 'test_api_key';
		const endpointUrl =
			apiUrl + `/api/CardanoTx/GetBalance?srcChainId=${chain}&address=${address}`;

		Logger.debug(`axios.get: ${endpointUrl}`);

		try {
			const response = await axios.get(endpointUrl, {
				headers: {
					'X-API-KEY': apiKey,
					'Content-Type': 'application/json',
				},
			});

			Logger.debug(`axios.response: ${JSON.stringify(response.data)}`);

			return response.data as BalanceResponseDto;
		} catch (error) {
			if (error instanceof AxiosError) {
				if (error.response) {
					throw new BadRequestException(
						error.response.data as ErrorResponseDto,
					);
				}
			}

			throw new BadRequestException();
		}
	}
}
