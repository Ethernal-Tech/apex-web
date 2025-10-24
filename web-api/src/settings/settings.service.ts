import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { retryForever } from 'src/utils/generalUtils';
import {
	LayerZeroChainSettingsDto,
	SettingsFullResponseDto,
	SettingsResponseDto,
} from './settings.dto';
import { ErrorResponseDto } from 'src/transaction/transaction.dto';
import { BridgingModeEnum, ChainEnum, TxTypeEnum } from 'src/common/enum';

const RETRY_DELAY_MS = 5000;
const settingsApiPath = `/api/CardanoTx/GetSettings`;
@Injectable()
export class SettingsService {
	SettingsResponse: SettingsFullResponseDto;

	constructor() {}

	async init() {
		const skylineUrl = process.env.CARDANO_API_SKYLINE_URL;
		const skylineApiKey = process.env.CARDANO_API_SKYLINE_API_KEY;

		if (!skylineUrl || !skylineApiKey) {
			throw new Error('cardano api url or api key not defined for skyline');
		}

		const reactorUrl = process.env.CARDANO_API_REACTOR_URL;
		const reactorApiKey = process.env.CARDANO_API_REACTOR_API_KEY;

		if (!reactorUrl || !reactorApiKey) {
			throw new Error('cardano api url or api key not defined for reactor');
		}

		const [skylineSettings, reactorSettings] = await Promise.all([
			retryForever(
				() => this.fetchOnce(skylineUrl, skylineApiKey),
				RETRY_DELAY_MS,
			),
			retryForever(
				() => this.fetchOnce(reactorUrl, reactorApiKey),
				RETRY_DELAY_MS,
			),
		]);

		const layerZeroChains = (process.env.LAYERZERO_CONFIG || '')
			.split(',')
			.map((x) => {
				const subItems = x.split('::');
				if (subItems.length < 4) {
					return;
				}

				const item = new LayerZeroChainSettingsDto();
				item.chain = subItems[0].trim() as ChainEnum;
				item.oftAddress = subItems[1].trim();
				item.chainID = parseInt(subItems[2].trim(), 10);
				item.txType = subItems[3].trim() as TxTypeEnum;

				return item;
			})
			.filter((x) => !!x);

		const allowedDirections: { [key: string]: string[] } = {};
		// reactor
		for (const [srcChain, dstChains] of Object.entries(
			reactorSettings.bridgingSettings.allowedDirections,
		)) {
			if (srcChain in allowedDirections) {
				allowedDirections[srcChain].push(...dstChains);
			} else {
				allowedDirections[srcChain] = [...dstChains];
			}
		}
		// skyline
		for (const [srcChain, dstChains] of Object.entries(
			skylineSettings.bridgingSettings.allowedDirections,
		)) {
			if (srcChain in allowedDirections) {
				allowedDirections[srcChain].push(...dstChains);
			} else {
				allowedDirections[srcChain] = [...dstChains];
			}
		}
		// layer zero
		allowedDirections[ChainEnum.Base] = [ChainEnum.Nexus, ChainEnum.BNB];
		allowedDirections[ChainEnum.BNB] = [ChainEnum.Nexus, ChainEnum.Base];
		if (ChainEnum.Nexus in allowedDirections) {
			allowedDirections[ChainEnum.Nexus].push(ChainEnum.Base, ChainEnum.BNB);
		} else {
			allowedDirections[ChainEnum.Nexus] = [ChainEnum.Base, ChainEnum.BNB];
		}

		allowedDirections[ChainEnum.Solana] = [ChainEnum.Prime]; // TODO: Hack for hackaton
		allowedDirections[ChainEnum.Prime].push(ChainEnum.Solana); // TODO: Hack for hackaton

		const enabledChains = new Set<string>();
		// reactor
		reactorSettings.enabledChains.forEach((chain) => enabledChains.add(chain));
		// skyline
		skylineSettings.enabledChains.forEach((chain) => enabledChains.add(chain));
		// layer zero
		layerZeroChains.forEach((x) => enabledChains.add(x.chain));

		enabledChains.add(ChainEnum.Solana); // TODO: hack for hackaton

		this.SettingsResponse = new SettingsFullResponseDto();
		this.SettingsResponse.layerZeroChains = layerZeroChains;
		this.SettingsResponse.settingsPerMode = {
			[BridgingModeEnum.Reactor]: reactorSettings,
			[BridgingModeEnum.Skyline]: skylineSettings,
		};
		this.SettingsResponse.allowedDirections = allowedDirections;
		this.SettingsResponse.enabledChains = Array.from(enabledChains);

		Logger.debug(`settings dto ${JSON.stringify(this.SettingsResponse)}`);
	}

	private async fetchOnce(
		url: string,
		apiKey: string,
	): Promise<SettingsResponseDto> {
		const endpointUrl = url + settingsApiPath;

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
