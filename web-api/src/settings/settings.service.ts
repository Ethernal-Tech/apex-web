import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { retryForever } from 'src/utils/generalUtils';
import {
	BridgingSettingsDirectionConfigDto,
	BridgingSettingsEcosystemTokenDto,
	LayerZeroChainSettingsDto,
	ReactorOnlySettingsResponseDto,
	SettingsFullResponseDto,
	SettingsResponseDto,
} from './settings.dto';
import { ErrorResponseDto } from 'src/transaction/transaction.dto';
import { BridgingModeEnum, ChainEnum, TxTypeEnum } from 'src/common/enum';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { getReactorValidatorChangeStatus } from './settings.helper';
import { getCurrencyIDFromDirectionConfig, Lovelace } from './utils';

const RETRY_DELAY_MS = 5000;
const settingsApiPath = `/api/CardanoTx/GetSettings`;

@Injectable()
export class SettingsService {
	SettingsResponse: SettingsFullResponseDto;
	reactorValidatorChangeStatus: boolean;

	constructor(
		private readonly schedulerRegistry: SchedulerRegistry,
		private readonly appConfig: AppConfigService,
	) {}

	async init() {
		this.reactorValidatorChangeStatus = await getReactorValidatorChangeStatus(
			this.appConfig,
		);

		const skylineUrl = this.appConfig.cardanoSkylineApiUrl;
		const skylineApiKey = process.env.CARDANO_API_SKYLINE_API_KEY;

		if (!skylineUrl || !skylineApiKey) {
			throw new Error('cardano api url or api key not defined for skyline');
		}

		const reactorUrl = this.appConfig.cardanoReactorApiUrl;
		const reactorApiKey = process.env.CARDANO_API_REACTOR_API_KEY;

		if (!reactorUrl || !reactorApiKey) {
			throw new Error('cardano api url or api key not defined for reactor');
		}

		const [skylineSettings, reactorSettings] = await Promise.all([
			retryForever(
				() => this.fetchOnce<SettingsResponseDto>(skylineUrl, skylineApiKey),
				RETRY_DELAY_MS,
			),
			retryForever(
				() =>
					this.fetchOnce<ReactorOnlySettingsResponseDto>(
						reactorUrl,
						reactorApiKey,
					),
				RETRY_DELAY_MS,
			),
		]);

		const layerZeroChains = this.appConfig.layerZero.networks
			.map((network) => {
				if (!network.chain || !network.oftAddress) {
					return undefined;
				}

				const item = new LayerZeroChainSettingsDto();
				item.chain = network.chain as ChainEnum;
				item.oftAddress = network.oftAddress;
				item.chainID = network.chainID;
				item.txType = network.txType as TxTypeEnum;

				return item;
			})
			.filter((x) => !!x);

		const ecosystemTokens: BridgingSettingsEcosystemTokenDto[] = [
			...skylineSettings.bridgingSettings.ecosystemTokens,
		];
		const directionConfig: {
			[key: string]: BridgingSettingsDirectionConfigDto;
		} = { ...skylineSettings.bridgingSettings.directionConfig };

		// convert reactor
		const apexID = getCurrencyIDFromDirectionConfig(
			directionConfig,
			ChainEnum.Prime,
		);
		if (!apexID) {
			throw new Error(
				`failed to find currencyID for chain: ${ChainEnum.Prime}`,
			);
		}

		const apexEcosystemToken = ecosystemTokens.find(
			(x: BridgingSettingsEcosystemTokenDto) => x.id === apexID,
		);
		if (!apexEcosystemToken) {
			throw new Error(
				`failed to find currency ecosystem token for chain: ${ChainEnum.Prime}`,
			);
		}

		const reactorConvertedSettings: SettingsResponseDto = {
			enabledChains: [...reactorSettings.enabledChains],
			bridgingSettings: {
				maxAmountAllowedToBridge:
					reactorSettings.bridgingSettings.maxAmountAllowedToBridge,
				maxReceiversPerBridgingRequest:
					reactorSettings.bridgingSettings.maxReceiversPerBridgingRequest,
				maxTokenAmountAllowedToBridge: '0',
				minChainFeeForBridging: {
					...reactorSettings.bridgingSettings.minChainFeeForBridging,
				},
				minChainFeeForBridgingTokens: {},
				minColCoinsAllowedToBridge: 0,
				minOperationFee: {},
				minUtxoChainValue: {
					...reactorSettings.bridgingSettings.minUtxoChainValue,
				},
				minValueToBridge: reactorSettings.bridgingSettings.minValueToBridge,
				ecosystemTokens: [apexEcosystemToken],
				directionConfig: {
					[ChainEnum.Prime]: {
						destChain: {},
						tokens: {
							[apexID]: {
								chainSpecific: Lovelace,
								lockUnlock: true,
								isWrappedCurrency: false,
							},
						},
					},
					[ChainEnum.Vector]: {
						destChain: {},
						tokens: {
							[apexID]: {
								chainSpecific: Lovelace,
								lockUnlock: true,
								isWrappedCurrency: false,
							},
						},
					},
					[ChainEnum.Nexus]: {
						destChain: {},
						tokens: {
							[apexID]: {
								chainSpecific: Lovelace,
								lockUnlock: true,
								isWrappedCurrency: false,
							},
						},
					},
				},
			},
		};

		//just in case skyline doesn't include nexus from the start
		if (!directionConfig[ChainEnum.Nexus]) {
			directionConfig[ChainEnum.Nexus] = {
				destChain: {},
				tokens: {
					[apexID]: {
						chainSpecific: Lovelace,
						lockUnlock: true,
						isWrappedCurrency: false,
					},
				},
			};
		}

		for (const [srcChain, dstChains] of Object.entries(
			reactorSettings.bridgingSettings.allowedDirections,
		)) {
			const currencyID = getCurrencyIDFromDirectionConfig(
				directionConfig,
				srcChain,
			);
			if (!currencyID) {
				throw new Error(`failed to find currencyID for chain: ${srcChain}`);
			}

			for (const dstChain of dstChains) {
				reactorConvertedSettings.bridgingSettings.directionConfig[
					srcChain
				].destChain = {
					...reactorConvertedSettings.bridgingSettings.directionConfig[srcChain]
						.destChain,
					[dstChain]: [
						...reactorConvertedSettings.bridgingSettings.directionConfig[
							srcChain
						].destChain[dstChain],
						{ srcTokenID: currencyID, dstTokenID: currencyID },
					],
				};

				directionConfig[srcChain].destChain = {
					...directionConfig[srcChain].destChain,
					[dstChain]: [
						...directionConfig[srcChain].destChain[dstChain],
						{ srcTokenID: currencyID, dstTokenID: currencyID },
					],
				};
			}
		}

		// layer zero
		const ethID = Number.MAX_SAFE_INTEGER - 4;
		const bapexID = Number.MAX_SAFE_INTEGER - 3;
		const bnapexID = Number.MAX_SAFE_INTEGER - 2;
		const bnbID = Number.MAX_SAFE_INTEGER - 1;
		ecosystemTokens.push(
			{ id: ethID, name: 'ETH' },
			{ id: bapexID, name: 'BAP3X' },
			{ id: bnapexID, name: 'BNAP3X' },
			{ id: bnbID, name: 'BNB' },
		);

		directionConfig[ChainEnum.Base] = {
			destChain: {
				[ChainEnum.Nexus]: [{ srcTokenID: bapexID, dstTokenID: apexID }],
				[ChainEnum.BNB]: [{ srcTokenID: bapexID, dstTokenID: bnapexID }],
			},
			tokens: {
				[ethID]: {
					chainSpecific: Lovelace,
					lockUnlock: true,
					isWrappedCurrency: false,
				},
				[bapexID]: {
					chainSpecific: 'BAP3X',
					lockUnlock: false,
					isWrappedCurrency: true,
				},
			},
		};

		directionConfig[ChainEnum.BNB] = {
			destChain: {
				[ChainEnum.Nexus]: [{ srcTokenID: bnapexID, dstTokenID: apexID }],
				[ChainEnum.Base]: [{ srcTokenID: bnapexID, dstTokenID: bapexID }],
			},
			tokens: {
				[bnbID]: {
					chainSpecific: Lovelace,
					lockUnlock: true,
					isWrappedCurrency: false,
				},
				[bnapexID]: {
					chainSpecific: 'BNAP3X',
					lockUnlock: false,
					isWrappedCurrency: true,
				},
			},
		};

		directionConfig[ChainEnum.Nexus].destChain = {
			...directionConfig[ChainEnum.Nexus].destChain,
			[ChainEnum.Base]: [{ srcTokenID: apexID, dstTokenID: bapexID }],
			[ChainEnum.BNB]: [{ srcTokenID: apexID, dstTokenID: bnbID }],
		};

		const enabledChains = new Set<string>();
		// reactor
		reactorSettings.enabledChains.forEach((chain) => enabledChains.add(chain));
		// skyline
		skylineSettings.enabledChains.forEach((chain) => enabledChains.add(chain));
		// layer zero
		layerZeroChains.forEach((x) => enabledChains.add(x.chain));

		this.SettingsResponse = new SettingsFullResponseDto();
		this.SettingsResponse.layerZeroChains = layerZeroChains;
		this.SettingsResponse.settingsPerMode = {
			[BridgingModeEnum.Reactor]: reactorConvertedSettings,
			[BridgingModeEnum.Skyline]: skylineSettings,
		};
		this.SettingsResponse.directionConfig = directionConfig;
		this.SettingsResponse.enabledChains = Array.from(enabledChains);

		Logger.debug(`settings dto ${JSON.stringify(this.SettingsResponse)}`);
	}

	private async fetchOnce<T>(url: string, apiKey: string): Promise<T> {
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

			return response.data as T;
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
			this.reactorValidatorChangeStatus = await getReactorValidatorChangeStatus(
				this.appConfig,
			);
		} catch (error) {
			Logger.error('Failed to update validator set change status.', error);
		} finally {
			job.start();

			Logger.debug('Job updateValidatorChangeStatus executed');
		}
	}
}
