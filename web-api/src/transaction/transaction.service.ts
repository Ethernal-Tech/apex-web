import { BadRequestException, Injectable } from '@nestjs/common';

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

@Injectable()
export class TransactionService {
	constructor(
		@InjectRepository(BridgeTransaction)
		private readonly bridgeTransactionRepository: Repository<BridgeTransaction>,
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
		const txHash = await submitCardanoTransaction(
			dto.originChain,
			dto.signedTxRaw,
		);
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

		const tx = await createEthBridgingTx(dto);

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
		await this.bridgeTransactionRepository.save(newBridgeTransaction);

		return mapBridgeTransactionToResponse(newBridgeTransaction);
	}
}
