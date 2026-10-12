import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
} from '@nestjs/common';
import {
	createCardanoBridgingTx,
	createEthBridgingTx,
	getCardanoBridgingTxFee,
	createSolanaBridgingTx,
} from 'src/transaction/transaction.helper';
import {
	CreateTransactionDto,
	CreateCardanoTransactionResponseDto,
	CardanoTransactionFeeResponseDto,
	CreateEthTransactionFullResponseDto,
	CreateSolanaTransactionFullResponseDto,
} from './transaction.dto';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { BridgingModeEnum } from 'src/common/enum';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { getInputUtxos } from 'src/bridgeTransaction/bridgeTransaction.helper';
import { SettingsService } from 'src/settings/settings.service';
import { Utxo } from 'src/blockchain/dto';
import { Logger } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import {
	LayerZeroTransferDto,
	LayerZeroTransferResponseDto,
} from './layerzerotransaction.dto';
import {
	getBridgingMode,
	getBridgingSettings,
	isCardanoChain,
	isEvmChain,
	isSolanaChain,
} from 'src/utils/chainUtils';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { getAppConfig } from 'src/appConfig/appConfig';
import { getCurrencyIDFromDirectionConfig } from 'src/settings/utils';
import { isAddress } from 'web3-validator';

@Injectable()
export class TransactionService {
	constructor(
		@InjectRepository(BridgeTransaction)
		private readonly bridgeTransactionRepository: Repository<BridgeTransaction>,
		private readonly settingsService: SettingsService,
		private readonly appConfig: AppConfigService,
	) {}

	private validateCreateTx(dto: CreateTransactionDto) {
		if (
			!this.settingsService.SettingsResponse.enabledChains.includes(
				dto.originChain,
			) ||
			!this.settingsService.SettingsResponse.enabledChains.includes(
				dto.destinationChain,
			)
		) {
			throw new BadRequestException('Chain not supported');
		}

		const settings = getBridgingSettings(
			dto.originChain,
			dto.destinationChain,
			dto.tokenID,
			this.settingsService.SettingsResponse,
		);
		if (!settings) {
			throw new BadRequestException(
				`Bridging token ${dto.tokenID} from ${dto.originChain} to ${dto.destinationChain} not supported`,
			);
		}

		const currencyID = getCurrencyIDFromDirectionConfig(
			this.settingsService.SettingsResponse.directionConfig,
			dto.originChain,
		);
		if (!currencyID) {
			throw new InternalServerErrorException(
				`No currencyID for source chain: ${dto.originChain}`,
			);
		}

		const srcMinFee =
			dto.tokenID !== currencyID && isCardanoChain(dto.originChain)
				? settings.bridgingSettings.minChainFeeForBridgingTokens[
						dto.originChain
					]
				: settings.bridgingSettings.minChainFeeForBridging[dto.originChain];
		if (!srcMinFee) {
			throw new InternalServerErrorException(
				`No minFee for source chain: ${dto.originChain}`,
			);
		}

		const minBridgingFee = BigInt(srcMinFee || '0');
		const bridgingFee = BigInt(dto.bridgingFee || '0');
		if (bridgingFee !== BigInt(0) && bridgingFee < minBridgingFee) {
			throw new BadRequestException(
				'Bridging fee in request body is less than minimum',
			);
		}

		const srcMinOperationFee =
			settings.bridgingSettings.minOperationFee &&
			settings.bridgingSettings.minOperationFee[dto.originChain];

		const minOperationFee = BigInt(srcMinOperationFee || '0');
		const operationFee = BigInt(dto.operationFee || '0');
		if (operationFee !== BigInt(0) && operationFee < minOperationFee) {
			throw new BadRequestException(
				'Operation fee in request body is less than minimum',
			);
		}
	}

	private validateCreateCardanoTx(dto: CreateTransactionDto) {
		if (!isCardanoChain(dto.originChain)) {
			throw new BadRequestException(
				`Chain ${dto.originChain} is not Cardano chain`,
			);
		}

		return this.validateCreateTx(dto);
	}

	private validateCreateEthTx(dto: CreateTransactionDto) {
		if (!isEvmChain(dto.originChain)) {
			throw new BadRequestException(
				`Chain ${dto.originChain} is not EVM chain`,
			);
		}

		return this.validateCreateTx(dto);
	}

	private validateCreateSolanaTx(dto: CreateTransactionDto) {
		if (!isSolanaChain(dto.originChain)) {
			throw new BadRequestException(
				`Chain ${dto.originChain} is not Solana chain`,
			);
		}

		return this.validateCreateTx(dto);
	}

	async getRecentInputs(dto: CreateTransactionDto): Promise<Utxo[]> {
		const recentInputsThresholdMinutes =
			this.appConfig.bridge.recentInputsThresholdMinutes;
		const threshold = new Date(
			Date.now() - recentInputsThresholdMinutes * 60 * 1000,
		);
		const previousTxs = await this.bridgeTransactionRepository.find({
			where: {
				senderAddress: dto.senderAddress,
				createdAt: MoreThan(threshold),
			},
		});

		const skipUtxos: Utxo[] = [];
		for (let i = 0; i < previousTxs.length; ++i) {
			if (previousTxs[i].txRaw) {
				try {
					const inputs = getInputUtxos(previousTxs[i].txRaw);
					skipUtxos.push(...inputs);
				} catch (e) {
					Logger.error(`Error while getInputUtxos: ${e}`, e.stack);
				}
			}
		}

		return skipUtxos;
	}

	async createCardano(
		dto: CreateTransactionDto,
	): Promise<CreateCardanoTransactionResponseDto> {
		this.validateCreateCardanoTx(dto);

		const bridgingMode = getBridgingMode(
			dto.originChain,
			dto.destinationChain,
			dto.tokenID,
			this.settingsService.SettingsResponse,
		);

		if (
			bridgingMode === BridgingModeEnum.Reactor &&
			this.settingsService.reactorValidatorChangeStatus
		) {
			throw new BadRequestException(
				'validator set change in progress, cant create transactions',
			);
		}

		const recentInputs = await this.getRecentInputs(dto);
		const tx = await createCardanoBridgingTx(dto, recentInputs, bridgingMode!);

		if (!tx) {
			throw new BadRequestException('error while creating bridging tx');
		}

		return tx;
	}

	async getCardanoTxFee(
		dto: CreateTransactionDto,
	): Promise<CardanoTransactionFeeResponseDto> {
		this.validateCreateCardanoTx(dto);

		const bridgingMode = getBridgingMode(
			dto.originChain,
			dto.destinationChain,
			dto.tokenID,
			this.settingsService.SettingsResponse,
		);

		if (
			bridgingMode === BridgingModeEnum.Reactor &&
			this.settingsService.reactorValidatorChangeStatus
		) {
			throw new BadRequestException(
				'validator set change in progress, cant create transactions',
			);
		}
		const recentInputs = await this.getRecentInputs(dto);
		const feeResp = await getCardanoBridgingTxFee(
			dto,
			recentInputs,
			bridgingMode!,
		);

		if (!feeResp) {
			throw new BadRequestException('error while getting bridging tx fee');
		}

		return feeResp;
	}

	createEth(dto: CreateTransactionDto): CreateEthTransactionFullResponseDto {
		this.validateCreateEthTx(dto);

		const bridgingMode = getBridgingMode(
			dto.originChain,
			dto.destinationChain,
			dto.tokenID,
			this.settingsService.SettingsResponse,
		);

		if (
			bridgingMode === BridgingModeEnum.Reactor &&
			this.settingsService.reactorValidatorChangeStatus
		) {
			throw new BadRequestException(
				'validator set change in progress, cant create transactions',
			);
		}

		const settings = getBridgingSettings(
			dto.originChain,
			dto.destinationChain,
			dto.tokenID,
			this.settingsService.SettingsResponse,
		);
		if (!settings) {
			throw new BadRequestException(
				`Bridging token ${dto.tokenID} from ${dto.originChain} to ${dto.destinationChain} not supported`,
			);
		}

		const tx = createEthBridgingTx(
			dto,
			bridgingMode!,
			settings.bridgingSettings,
		);
		if (!tx) {
			throw new BadRequestException('error while creating bridging tx');
		}

		return tx;
	}

	async createSolana(
		dto: CreateTransactionDto,
	): Promise<CreateSolanaTransactionFullResponseDto> {
		this.validateCreateSolanaTx(dto);

		const settings = getBridgingSettings(
			dto.originChain,
			dto.destinationChain,
			dto.tokenID,
			this.settingsService.SettingsResponse,
		);
		if (!settings) {
			throw new BadRequestException(
				`Bridging token ${dto.tokenID} from ${dto.originChain} to ${dto.destinationChain} not supported`,
			);
		}

		const bridgingMode = getBridgingMode(
			dto.originChain,
			dto.destinationChain,
			dto.tokenID,
			this.settingsService.SettingsResponse,
		);

		const tx = await createSolanaBridgingTx(dto, bridgingMode!);
		if (!tx) {
			throw new BadRequestException('error while creating bridging tx');
		}

		return tx;
	}

	async transferLayerZero(
		dto: LayerZeroTransferDto,
	): Promise<LayerZeroTransferResponseDto> {
		if (!isAddress(dto.from)) {
			throw new BadRequestException(
				`error while calling Layer Zero transfer: request.from is not a valid address`,
			);
		}

		if (!isAddress(dto.to)) {
			throw new BadRequestException(
				`error while calling Layer Zero transfer: request.to is not a valid address`,
			);
		}

		try {
			const lzConfig = getAppConfig().layerZero;

			const endpointUrl = `${lzConfig.apiUrl}/transfer`;
			Logger.debug(`axios.get: ${endpointUrl}`);

			const response: AxiosResponse<any, any> = await axios.get(endpointUrl, {
				params: dto,
				headers: { 'x-layerzero-api-key': process.env.LAYERZERO_APIKEY },
			});

			return response.data as LayerZeroTransferResponseDto;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				throw new BadRequestException(
					`Request failed: ${error.response?.data.message || error.message}`,
				);
			}

			throw new BadRequestException(
				`error while calling Layer Zero transfer: ${error}`,
			);
		}
	}
}
