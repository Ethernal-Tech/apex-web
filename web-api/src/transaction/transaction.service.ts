import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
} from '@nestjs/common';
import {
	createCardanoBridgingTx,
	createEthBridgingTx,
	getCardanoBridgingTxFee,
} from 'src/transaction/transaction.helper';
import {
	CreateTransactionDto,
	CreateCardanoTransactionResponseDto,
	TransactionSubmittedDto,
	CreateEthTransactionResponseDto,
	CardanoTransactionFeeResponseDto,
} from './transaction.dto';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { ChainApexBridgeEnum, TransactionStatusEnum } from 'src/common/enum';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import {
	getInputUtxos,
	mapBridgeTransactionToResponse,
} from 'src/bridgeTransaction/bridgeTransaction.helper';
import { BridgeTransactionDto } from 'src/bridgeTransaction/bridgeTransaction.dto';
import { SettingsService } from 'src/settings/settings.service';
import { Utxo } from 'src/blockchain/dto';
import { Logger } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import {
	LayerZeroTransferDto,
	LayerZeroTransferResponseDto,
} from './layerzerotransaction.dto';
import { isAllowedDirection, isCardanoChain, isEvmChain } from 'src/utils/chainUtils';

@Injectable()
export class TransactionService {
	constructor(
		@InjectRepository(BridgeTransaction)
		private readonly bridgeTransactionRepository: Repository<BridgeTransaction>,
		private readonly settingsService: SettingsService,
	) { }

	private async validateCreateCardanoTx(dto: CreateTransactionDto) {
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

		if (!isCardanoChain(dto.originChain)) {
			throw new BadRequestException('Invalid origin chain');
		}

		if (
			!isAllowedDirection(
				dto.originChain,
				dto.destinationChain,
				this.settingsService.SettingsResponse.bridgingSettings
					.allowedDirections,
			)
		) {
			throw new BadRequestException(
				`Bridging from ${dto.originChain} to ${dto.destinationChain} not supported`,
			);
		}

		const srcMinFee =
			this.settingsService.SettingsResponse.bridgingSettings
				.minChainFeeForBridging[dto.originChain];
		if (!srcMinFee) {
			throw new InternalServerErrorException(
				`No minFee for source chain: ${dto.originChain}`,
			);
		}

		const minBridgingFee = BigInt(srcMinFee);
		const bridgingFee = BigInt(dto.bridgingFee || '0');
		if (bridgingFee !== BigInt(0) && bridgingFee < minBridgingFee) {
			throw new BadRequestException(
				'Bridging fee in request body is less than minimum',
			);
		}

		const srcMinOperationFee =
			this.settingsService.SettingsResponse.bridgingSettings.minOperationFee[
			dto.originChain
			];

		const minOperationFee = BigInt(srcMinOperationFee || '0');
		const operationFee = BigInt(dto.operationFee || '0');
		if (operationFee !== BigInt(0) && operationFee < minOperationFee) {
			throw new BadRequestException(
				'Operation fee in request body is less than minimum',
			);
		}
	}

	async getRecentInputs(dto: CreateTransactionDto): Promise<Utxo[]> {
		const recentInputsThresholdMinutes =
			process.env.RECENT_INPUTS_THRESHOLD_MINUTES || '5';
		const threshold = new Date(
			Date.now() - parseInt(recentInputsThresholdMinutes) * 60 * 1000,
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

		const recentInputs = await this.getRecentInputs(dto);
		const tx = await createCardanoBridgingTx(dto, recentInputs);

		if (!tx) {
			throw new BadRequestException('error while creating bridging tx');
		}

		return tx;
	}

	async getCardanoTxFee(
		dto: CreateTransactionDto,
	): Promise<CardanoTransactionFeeResponseDto> {
		this.validateCreateCardanoTx(dto);

		const recentInputs = await this.getRecentInputs(dto);
		const feeResp = await getCardanoBridgingTxFee(dto, recentInputs);

		if (!feeResp) {
			throw new BadRequestException('error while getting bridging tx fee');
		}

		return feeResp;
	}

	async createEth(
		dto: CreateTransactionDto,
	): Promise<CreateEthTransactionResponseDto> {
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

		if (!isEvmChain(dto.originChain)) {
			throw new BadRequestException('Invalid origin chain');
		}

		if (
			!isAllowedDirection(
				dto.originChain,
				dto.destinationChain,
				this.settingsService.SettingsResponse.bridgingSettings
					.allowedDirections,
			)
		) {
			throw new BadRequestException(
				`Bridging from ${dto.originChain} to ${dto.destinationChain} not supported`,
			);
		}

		const tx = await createEthBridgingTx(
			dto,
			this.settingsService.SettingsResponse.bridgingSettings,
		);

		if (!tx) {
			throw new BadRequestException('error while creating bridging tx');
		}

		return tx;
	}

	async transactionSubmitted({
		originChain,
		destinationChain,
		originTxHash,
		senderAddress,
		receiverAddrs,
		amount,
		nativeTokenAmount,
		txRaw,
		isFallback,
		isLayerZero,
	}: TransactionSubmittedDto): Promise<BridgeTransactionDto> {
		const entity = new BridgeTransaction();

		const receiverAddresses = receiverAddrs.join(', ');

		entity.sourceTxHash = originTxHash;
		entity.senderAddress = senderAddress ?? entity.senderAddress;
		entity.receiverAddresses = receiverAddresses ?? entity.receiverAddresses;
		entity.destinationChain =
			(destinationChain as ChainApexBridgeEnum) ?? entity.destinationChain;
		entity.amount = amount ? amount : entity.amount;
		entity.nativeTokenAmount = nativeTokenAmount
			? nativeTokenAmount
			: entity.nativeTokenAmount;

		entity.originChain = originChain;
		entity.createdAt = new Date();
		entity.status = TransactionStatusEnum.Pending;
		entity.txRaw = txRaw;
		entity.isCentralized = isFallback;
		entity.isLayerZero = isLayerZero;

		const newBridgeTransaction =
			this.bridgeTransactionRepository.create(entity);

		try {
			await this.bridgeTransactionRepository.save(newBridgeTransaction);
			return mapBridgeTransactionToResponse(newBridgeTransaction);
		} catch (e) {
			const dbTxs = await this.bridgeTransactionRepository.find({
				where: {
					sourceTxHash: entity.sourceTxHash,
				},
			});

			// we expect only one tx to return since there is a unique constraint
			if (dbTxs.length != 0) {
				return mapBridgeTransactionToResponse(dbTxs[0]);
			} else {
				throw new BadRequestException(
					`error while confirming tx submittion: ${e}`,
				);
			}
		}
	}

	async transferLayerZero(
		dto: LayerZeroTransferDto,
	): Promise<LayerZeroTransferResponseDto> {
		try {
			const endpointUrl = `${process.env.LAYERZERO_API_URL}/transfer`;
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
