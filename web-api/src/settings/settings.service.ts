import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { retryForever } from 'src/utils/generalUtils';
import {
	LayerZeroChainSettingsDto,
	SettingsFullResponseDto,
} from './settings.dto';
import { ErrorResponseDto } from 'src/transaction/transaction.dto';
import { ChainEnum } from 'src/common/enum';

const RETRY_DELAY_MS = 5000;

@Injectable()
export class SettingsService {
	SettingsResponse: SettingsFullResponseDto;

	constructor() {}

	async init() {
		const apiUrl = process.env.CARDANO_API_URL;
		const apiKey = process.env.CARDANO_API_API_KEY;

		if (!apiUrl || !apiKey) {
			throw new Error('cardano api url or api key not defined');
		}

		const endpointUrl = apiUrl + `/api/CardanoTx/GetSettings`;

		this.SettingsResponse = await retryForever(
			() => this.fetchOnce(endpointUrl, apiKey),
			RETRY_DELAY_MS,
		);

		const chains = (process.env.LAYERZERO_CONFIG || '').split(',');
		this.SettingsResponse.layerZeroChains = chains
			.map((x) => {
				const subItems = x.split('::');
				if (subItems.length < 4) {
					return;
				}

				const item = new LayerZeroChainSettingsDto();
				item.chain = subItems[0].trim() as ChainEnum;
				item.rpcUrl = subItems[1].trim();
				item.oftAddress = subItems[2].trim();
				item.chainID = parseInt(subItems[3].trim(), 10);

				return item;
			})
			.filter((x) => !!x);

		this.SettingsResponse.layerZeroChains.forEach((x) => {
			if (!this.SettingsResponse.enabledChains.includes(x.chain)) {
				this.SettingsResponse.enabledChains.push(x.chain);
			}
		});

		Logger.debug(`settings dto ${JSON.stringify(this.SettingsResponse)}`);
	}

	private async fetchOnce(
		endpointUrl: string,
		apiKey: string,
	): Promise<SettingsFullResponseDto> {
		Logger.debug(`axios.get: ${endpointUrl}`);

		try {
			const response = await axios.get(endpointUrl, {
				headers: {
					'X-API-KEY': apiKey,
					'Content-Type': 'application/json',
				},
			});

			Logger.debug(`axios.response: ${JSON.stringify(response.data)}`);

			return response.data as SettingsFullResponseDto;
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
