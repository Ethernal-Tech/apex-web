import { BadRequestException, Injectable } from '@nestjs/common';

import {
	createBridgingTx,
	getProtocolParams,
	signBridgingTx,
	submitTransaction,
} from 'src/transaction/transaction.helper';
import {
	CreateTransactionDto,
	CreateTransactionResponseDto,
	ProtocolParamsResponseDto,
	SignTransactionDto,
	SubmitTransactionDto,
	SubmitTransactionResponseDto,
	TransactionResponseDto,
	TransactionSubmittedDto,
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

	async createTransaction({
		senderAddress,
		originChain,
		destinationChain,
		receivers,
		bridgingFee,
	}: CreateTransactionDto): Promise<CreateTransactionResponseDto> {
		if (bridgingFee !== undefined && bridgingFee < 0) {
			const error = 'bridgingFee negative';
			console.log(error);
			throw new BadRequestException(error);
		}

		const tx = await createBridgingTx(
			senderAddress,
			originChain,
			destinationChain,
			receivers,
			bridgingFee,
		);

		if (!tx) {
			const error = 'error while creating bridging tx';
			console.log(error);
			throw new BadRequestException(error);
		}

		return tx;
	}

	async signTransaction({
		signingKeyHex,
		txRaw,
		txHash,
	}: SignTransactionDto): Promise<TransactionResponseDto> {
		const tx = await signBridgingTx(signingKeyHex, txRaw, txHash);

		if (!tx) {
			const error = 'error while signing bridging tx';
			console.log(error);
			throw new BadRequestException(error);
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
	}: TransactionSubmittedDto): Promise<BridgeTransactionDto> {
		const entity = new BridgeTransaction();

		const receiverAddresses = receiverAddrs.join(', ');

		entity.sourceTxHash = originTxHash;
		entity.senderAddress = senderAddress ?? entity.senderAddress;
		entity.receiverAddresses = receiverAddresses ?? entity.receiverAddresses;
		entity.destinationChain =
			(destinationChain as ChainEnum) ?? entity.destinationChain;
		entity.amount = amount ? Number(amount) : entity.amount;

		entity.originChain = originChain;
		entity.createdAt = new Date();
		entity.status = TransactionStatusEnum.Pending;

		const newBridgeTransaction =
			this.bridgeTransactionRepository.create(entity);
		await this.bridgeTransactionRepository.save(newBridgeTransaction);

		return mapBridgeTransactionToResponse(newBridgeTransaction);
	}

	async submitTransaction(
		dto: SubmitTransactionDto,
	): Promise<SubmitTransactionResponseDto> {
		const txHash = await submitTransaction(dto.originChain, dto.signedTxRaw);
		const bridgeTx = await this.transactionSubmitted(dto);
		return { txHash, bridgeTx };
	}

	async getProtocolParams(
		chain: ChainEnum,
	): Promise<ProtocolParamsResponseDto> {
		const protocolParameters = await getProtocolParams(chain);
		return {
			txFeeFixed: protocolParameters.minFeeConstant.ada.lovelace.toString(10),
			txFeePerByte: protocolParameters.minFeeCoefficient.toString(10),
		};
	}
}
