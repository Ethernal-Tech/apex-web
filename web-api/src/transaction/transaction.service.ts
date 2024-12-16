import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
} from '@nestjs/common';
import dotenv from 'dotenv';
import {
	createCardanoBridgingTx,
	createEthBridgingTx,
	getCardanoBridgingTxFee,
	submitCardanoTransaction,
} from 'src/transaction/transaction.helper';
import {
	CreateTransactionDto,
	CreateCardanoTransactionResponseDto,
	SubmitCardanoTransactionDto,
	SubmitCardanoTransactionResponseDto,
	TransactionSubmittedDto,
	CreateEthTransactionResponseDto,
	CardanoTransactionFeeResponseDto,
} from './transaction.dto';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { ChainEnum, TransactionStatusEnum } from 'src/common/enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { mapBridgeTransactionToResponse } from 'src/bridgeTransaction/bridgeTransaction.helper';
import { BridgeTransactionDto } from 'src/bridgeTransaction/bridgeTransaction.dto';
import { SettingsService } from 'src/settings/settings.service';
import { Semaphore } from 'src/utils/semaphore';
import { retry } from 'src/utils/generalUtils';

// Load env file
dotenv.config({ path: '.env' });

const DEFAULT_SEMAPHORE_MAX = 6;
const SUBMIT_CARDANO_TX_TRY_COUNT = 5;
const SUBMIT_CARDANO_TX_RETRY_WAIT_TIME = 5000;

const submitCardanoSemaphore = new Semaphore(
	process.env.SUBMIT_CARDANO_SEMAPHORE_MAX
		? +process.env.SUBMIT_CARDANO_SEMAPHORE_MAX
		: DEFAULT_SEMAPHORE_MAX,
	'<submitCardanoSemaphore> - ',
);

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
			dto.originChain !== ChainEnum.Vector
		) {
			throw new BadRequestException('Invalid origin chain');
		}

		if (
			dto.originChain === ChainEnum.Prime &&
			dto.destinationChain !== ChainEnum.Vector &&
			dto.destinationChain !== ChainEnum.Nexus
		) {
			throw new BadRequestException('Invalid destination chain');
		}

		if (
			dto.originChain === ChainEnum.Vector &&
			dto.destinationChain !== ChainEnum.Prime
		) {
			throw new BadRequestException('Invalid destination chain');
		}
	}

	async createCardano(
		dto: CreateTransactionDto,
	): Promise<CreateCardanoTransactionResponseDto> {
		this.validateCreateCardanoTx(dto);

		const tx = await createCardanoBridgingTx(dto);

		if (!tx) {
			throw new BadRequestException('error while creating bridging tx');
		}

		return tx;
	}

	async getCardanoTxFee(
		dto: CreateTransactionDto,
	): Promise<CardanoTransactionFeeResponseDto> {
		this.validateCreateCardanoTx(dto);

		const feeResp = await getCardanoBridgingTxFee(dto);

		if (!feeResp) {
			throw new BadRequestException('error while getting bridging tx fee');
		}

		return feeResp;
	}

	async submitCardano(
		dto: SubmitCardanoTransactionDto,
	): Promise<SubmitCardanoTransactionResponseDto> {
		let txHash: string;
		try {
			txHash = await retry(
				async () => {
					await submitCardanoSemaphore.acquire();
					try {
						return await submitCardanoTransaction(
							dto.originChain,
							dto.signedTxRaw,
						);
					} catch (e) {
						throw e;
					} finally {
						submitCardanoSemaphore.release();
					}
				},
				SUBMIT_CARDANO_TX_TRY_COUNT,
				SUBMIT_CARDANO_TX_RETRY_WAIT_TIME,
			);
		} catch (e) {
			throw new InternalServerErrorException(e);
		}

		const bridgeTx = await this.transactionSubmitted(dto);

		return { txHash, bridgeTx };
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
				}
			});
			
			// we expect only one tx to return since there is a unique constraint
			if (dbTxs.length != 0) {
				return mapBridgeTransactionToResponse(dbTxs[0]);
			}
			else {
				throw new BadRequestException(`error while confirming tx submittion: ${e}`)
			}
		}
	}
}
