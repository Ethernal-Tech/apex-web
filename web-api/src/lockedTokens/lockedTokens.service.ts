import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { LockedTokensDto } from "./lockedTokens.dto";
import axios, { AxiosError } from "axios";
import { ErrorResponseDto } from "src/transaction/transaction.dto";

@Injectable()
export class LockedTokensService{
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