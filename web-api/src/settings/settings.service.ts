import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { retryForever } from 'src/utils/generalUtils';
import { SettingsResponseDto } from './settings.dto';
import { ErrorResponseDto } from 'src/transaction/transaction.dto';

const RETRY_DELAY_MS = 5000;

@Injectable()
export class SettingsService {
	BridgingSettings: SettingsResponseDto;

	constructor() {}

	async init() {
		const apiUrl = process.env.ORACLE_URL;
		const apiKey = process.env.ORACLE_API_KEY;

		if (!apiUrl || !apiKey) {
			throw new Error('oracle api url or api key not defined');
		}

		const endpointUrl = apiUrl + `/api/Settings/Get`;

		this.BridgingSettings = await retryForever(
			() => this.fetchOnce(endpointUrl, apiKey),
			RETRY_DELAY_MS,
		);
	}

	private async fetchOnce(
		endpointUrl: string,
		apiKey: string,
	): Promise<SettingsResponseDto> {
		Logger.debug(`axios.get: ${endpointUrl}`);

		try {
			const response = await axios.get(endpointUrl, {
				headers: {
					'X-API-KEY': apiKey,
					'Content-Type': 'application/json',
				},
			});

			Logger.debug(`axios.response: ${JSON.stringify(response.data)}`);

			return response.data as SettingsResponseDto;
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
