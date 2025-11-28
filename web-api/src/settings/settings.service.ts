import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { retryForever } from 'src/utils/generalUtils';
import { SettingsResponseDto } from './settings.dto';
import { ErrorResponseDto } from 'src/transaction/transaction.dto';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { getValidatorChangeStatus } from './settings.helper';

const RETRY_DELAY_MS = 5000;

@Injectable()
export class SettingsService {
	SettingsResponse: SettingsResponseDto;
	validatorChangeStatus: boolean;

	constructor(
		private readonly appConfig: AppConfigService,
		private readonly schedulerRegistry: SchedulerRegistry,
	) {}

	async init() {
		this.validatorChangeStatus = await getValidatorChangeStatus();

		const apiUrl = this.appConfig.cardanoApiUrl;
		const apiKey = process.env.CARDANO_API_API_KEY;

		if (!apiUrl || !apiKey) {
			throw new Error('cardano api url or api key not defined');
		}

		const endpointUrl = apiUrl + `/api/CardanoTx/GetSettings`;

		this.SettingsResponse = await retryForever(
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

	@Cron('*/30 * * * * *', { name: 'updateValidatorChangeStatus' })
	async updateValidatorChangeStatus(): Promise<void> {
		const job = this.schedulerRegistry.getCronJob(
			'updateValidatorChangeStatus',
		);
		job.stop();
		try {
			this.validatorChangeStatus = await getValidatorChangeStatus();
		} catch (error) {
			Logger.error('Failed to update validator set change status.', error);
		} finally {
			job.start();

			Logger.debug('Job updateValidatorChangeStatus executed');
		}
	}
}
