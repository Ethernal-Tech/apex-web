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

@Injectable()
export class TransactionService {
	constructor(
		@InjectRepository(BridgeTransaction)
		private readonly bridgeTransactionRepository: Repository<BridgeTransaction>,
		private readonly settingsService: SettingsService,
	) {}

	private async validateCreateCardanoTx(dto: CreateTransactionDto) {
		if (
			dto.originChain !== ChainEnum.Prime &&
			dto.originChain !== ChainEnum.Vector &&
			dto.originChain !== ChainEnum.Cardano
		) {
			throw new BadRequestException('Invalid origin chain');
		}

		if (
			dto.originChain === ChainEnum.Prime &&
			dto.destinationChain !== ChainEnum.Vector &&
			dto.destinationChain !== ChainEnum.Nexus &&
			dto.destinationChain !== ChainEnum.Cardano
		) {
			throw new BadRequestException('Invalid destination chain');
		}

		if (
			dto.originChain === ChainEnum.Vector &&
			dto.destinationChain !== ChainEnum.Prime
		) {
			throw new BadRequestException('Invalid destination chain');
		}

		if (
			dto.originChain === ChainEnum.Cardano &&
			dto.destinationChain !== ChainEnum.Prime
		) {
			throw new BadRequestException('Invalid destination chain');
		}

		const srcMinFee =
			this.settingsService.BridgingSettings.minChainFeeForBridging[
				dto.originChain
			];
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
		this.settingsService.BridgingSettings.minOperationFee[
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
		if (dto.originChain !== ChainEnum.Nexus) {
			throw new BadRequestException('Invalid origin chain');
		}

		if (dto.destinationChain !== ChainEnum.Prime) {
			throw new BadRequestException('Invalid destination chain');
		}

		const tx = await createEthBridgingTx(
			dto,
			this.settingsService.BridgingSettings,
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
	}: TransactionSubmittedDto): Promise<BridgeTransactionDto> {
		const entity = new BridgeTransaction();

		const receiverAddresses = receiverAddrs.join(', ');

		entity.sourceTxHash = originTxHash;
		entity.senderAddress = senderAddress ?? entity.senderAddress;
		entity.receiverAddresses = receiverAddresses ?? entity.receiverAddresses;
		entity.destinationChain =
			(destinationChain as ChainEnum) ?? entity.destinationChain;
		entity.amount = amount ? amount : entity.amount;
		entity.nativeTokenAmount = nativeTokenAmount
			? nativeTokenAmount
			: entity.nativeTokenAmount;

		entity.originChain = originChain;
		entity.createdAt = new Date();
		entity.status = TransactionStatusEnum.Pending;
		entity.txRaw = txRaw;
		entity.isCentralized = isFallback;

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
}
