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
	CreateEthTransactionResponseDto,
	CardanoTransactionFeeResponseDto,
} from './transaction.dto';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { getInputUtxos } from 'src/bridgeTransaction/bridgeTransaction.helper';
import { SettingsService } from 'src/settings/settings.service';
import { Utxo } from 'src/blockchain/dto';
import { Logger } from '@nestjs/common';
import {
	isAllowedDirection,
	isCardanoChain,
	isEvmChain,
} from 'src/utils/chainUtils';
import { AppConfigService } from 'src/appConfig/appConfig.service';

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
}
