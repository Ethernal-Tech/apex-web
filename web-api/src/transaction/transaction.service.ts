import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from '@nestjs/common';
import {
	canUpdateTx,
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
	TransactionActivateDeleteDto,
} from './transaction.dto';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { ChainEnum, TransactionStatusEnum } from 'src/common/enum';
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
import {
	isAllowedDirection,
	isCardanoChain,
	isEvmChain,
} from 'src/utils/chainUtils';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { createHash } from 'crypto';

@Injectable()
export class TransactionService {
	constructor(
		@InjectRepository(BridgeTransaction)
		private readonly bridgeTransactionRepository: Repository<BridgeTransaction>,
		private readonly settingsService: SettingsService,
		private readonly appConfig: AppConfigService,
	) {}

	private validateCreateCardanoTx(dto: CreateTransactionDto) {
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

		const destMinFee =
			this.settingsService.SettingsResponse.bridgingSettings
				.minChainFeeForBridging[dto.destinationChain];
		if (!destMinFee) {
			throw new InternalServerErrorException(
				`No minFee for destination chain: ${dto.destinationChain}`,
			);
		}

		const minBridgingFee = BigInt(destMinFee);
		const bridgingFee = BigInt(dto.bridgingFee || '0');
		if (bridgingFee !== BigInt(0) && bridgingFee < minBridgingFee) {
			throw new BadRequestException(
				'Bridging fee in request body is less than minimum',
			);
		}
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
		if (this.settingsService.validatorChangeStatus) {
			throw new BadRequestException(
				'validator set change in progress, cant create transactions',
			);
		}

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
		if (this.settingsService.validatorChangeStatus) {
			throw new BadRequestException(
				'validator set change in progress, cant get cardano tx fee',
			);
		}
		this.validateCreateCardanoTx(dto);

		const recentInputs = await this.getRecentInputs(dto);
		const feeResp = await getCardanoBridgingTxFee(dto, recentInputs);

		if (!feeResp) {
			throw new BadRequestException('error while getting bridging tx fee');
		}

		return feeResp;
	}

	createEth(dto: CreateTransactionDto): CreateEthTransactionResponseDto {
		if (this.settingsService.validatorChangeStatus) {
			throw new BadRequestException(
				'validator set change in progress, cant create eth transaction',
			);
		}
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

		const tx = createEthBridgingTx(
			dto,
			this.settingsService.SettingsResponse.bridgingSettings,
		);

		if (!tx) {
			throw new BadRequestException('error while creating bridging tx');
		}

		return tx;
	}

	async transactionSubmitted(
		{
			originChain,
			destinationChain,
			originTxHash,
			senderAddress,
			receiverAddrs,
			amount,
			txRaw,
			isFallback,
		}: TransactionSubmittedDto,
		ip: string,
		activate = false,
	): Promise<BridgeTransactionDto> {
		const entity = new BridgeTransaction();

		const receiverAddresses = receiverAddrs
			.map((a) => (a ?? '').trim())
			.filter(Boolean)
			.join(', ');

		entity.sourceTxHash = (originTxHash ?? '').trim();
		entity.senderAddress = (senderAddress ?? '').trim() || entity.senderAddress;
		entity.receiverAddresses = receiverAddresses ?? entity.receiverAddresses;
		entity.destinationChain =
			(destinationChain as ChainEnum) ?? entity.destinationChain;
		entity.amount = (amount ?? '').trim() || entity.amount;

		entity.originChain = originChain;
		entity.createdAt = new Date();
		entity.status = TransactionStatusEnum.Pending;
		entity.txRaw = txRaw;
		entity.isCentralized = isFallback;
		entity.activeFrom = activate
			? new Date()
			: new Date(Date.now() + this.appConfig.txValidityPeriod);
		entity.clientID = activate
			? undefined
			: createHash('sha256')
					.update(ip + (this.appConfig.hashSecret ?? ''))
					.digest('hex');

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

	async updateTransaction(
		originChain: ChainEnum,
		originTxHash: string,
		ip: string,
		txRaw?: string,
	): Promise<BridgeTransactionDto> {
		const hash = originTxHash.trim();

		const entity = await this.bridgeTransactionRepository.findOne({
			where: { sourceTxHash: hash, originChain: originChain },
		});

		if (!entity) {
			throw new NotFoundException(`transaction with hash ${hash} not found`);
		}

		if (!canUpdateTx(ip, entity.clientID, entity.activeFrom)) {
			throw new BadRequestException('unauthorized transaction update');
		}

		// Apply updates
		if (txRaw !== undefined) {
			entity.txRaw = txRaw;
		}
		entity.activeFrom = new Date();
		entity.clientID = null;

		const savedEntity = await this.bridgeTransactionRepository.save(entity);

		return mapBridgeTransactionToResponse(savedEntity);
	}

	async removeTransaction(
		{ originChain, originTxHash }: TransactionActivateDeleteDto,
		ip: string,
	): Promise<void> {
		const hash = (originTxHash ?? '').trim();

		if (!hash) {
			throw new BadRequestException('originTxHash is required');
		}

		const entity = await this.bridgeTransactionRepository.findOne({
			where: { sourceTxHash: hash, originChain: originChain },
		});

		if (!entity) {
			throw new NotFoundException(`transaction with hash ${hash} not found`);
		}

		if (canUpdateTx(ip, entity?.clientID, entity.activeFrom)) {
			const result = await this.bridgeTransactionRepository.delete({
				sourceTxHash: hash,
				originChain: originChain,
			});

			if (result.affected === 0) {
				throw new NotFoundException(`Transaction with hash ${hash} not found`);
			}

			return;
		}

		throw new BadRequestException('unauthorized deletion of tx');
	}
}
