import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { LockedTokensDto } from "./lockedTokens.dto";
import axios, { AxiosError } from "axios";
import { ErrorResponseDto } from "src/transaction/transaction.dto";
import { retryForever } from "src/utils/generalUtils";

const RETRY_DELAY_MS = 30000;

@Injectable()
export class LockedTokensService{
	LockedTokensResponse: LockedTokensDto;
	
	async init() {
			const apiUrl = process.env.CARDANO_API_URL;
			const apiKey = process.env.CARDANO_API_API_KEY;
	
			if (!apiUrl || !apiKey) {
				throw new Error('cardano api url or api key not defined');
			}
	
			const endpointUrl = apiUrl + `/api/CardanoTx/GetLockedTokens`;
	
			this.LockedTokensResponse = await retryForever(
				() => this.getLockedTokens(endpointUrl, apiKey),
				RETRY_DELAY_MS,
			);
	}

    async getLockedTokens(
		endpointUrl: string,
		apiKey: string,
	): Promise<LockedTokensDto> {
		Logger.debug(`axios.get: ${endpointUrl}`);

		try {
			const response = await axios.get(endpointUrl, {
				headers: {
					'X-API-KEY': apiKey,
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