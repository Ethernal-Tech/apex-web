import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { LockedTokensDto } from './lockedTokens.dto';
import axios, { AxiosError } from 'axios';
import { ErrorResponseDto } from 'src/transaction/transaction.dto';

const RETRY_DELAY_MS = 5000;

@Injectable()
export class LockedTokensService {
	endpointUrl: string;
	apiKey = process.env.CARDANO_API_API_KEY;

	async init() {
		this.endpointUrl =
			process.env.CARDANO_API_URL + `/api/CardanoTx/GetLockedTokens`;
	}

	public async getLockedTokens(): Promise<LockedTokensDto> {
		Logger.debug(`axios.get: ${this.endpointUrl}`);

		try {
			const response = await axios.get(this.endpointUrl, {
				headers: {
					'X-API-KEY': this.apiKey,
					'Content-Type': 'application/json',
				},
			});

			Logger.debug(`axios.response: ${JSON.stringify(response.data)}`);

			return response.data as LockedTokensDto;
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
