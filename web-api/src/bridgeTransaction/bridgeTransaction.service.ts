import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionStatusEnum } from 'src/common/enum';
import { Repository } from 'typeorm';
import { BridgeTransaction } from './bridgeTransaction.entity';
import {
	CreateBridgeTransactionDto,
	BridgeTransactionDto,
	UpdateBridgeTransactionDto,
} from './bridgeTransaction.dto';

@Injectable()
export class BridgeTransactionService {
	constructor(
		@InjectRepository(BridgeTransaction)
		private readonly bridgeTransactionRepository: Repository<BridgeTransaction>,
	) {}

	async get(id: number): Promise<BridgeTransactionDto> {
		const entity = await this.bridgeTransactionRepository.findOne({
			where: { id },
		});
		if (!entity) {
			throw new NotFoundException();
		}

		return this.mapToReponse(entity);
	}

	async getAll(): Promise<BridgeTransactionDto[]> {
		const entities = await this.bridgeTransactionRepository.find();

		return entities.map((entity) => this.mapToReponse(entity));
	}

	async create({
		senderAddress,
		receiverAddress,
		destinationChain,
		originChain,
		amount,
	}: CreateBridgeTransactionDto): Promise<BridgeTransactionDto> {
		let entity = new BridgeTransaction();
		entity.senderAddress = senderAddress;
		entity.receiverAddress = receiverAddress;
		entity.destinationChain = destinationChain;
		entity.originChain = originChain;
		entity.amount = amount;
		entity.createdAt = new Date();
		entity.status = TransactionStatusEnum.Pending;

		entity = await this.bridgeTransactionRepository.create(entity);
		entity = await this.bridgeTransactionRepository.save(entity);

		return this.mapToReponse(entity);
	}

	async update({
		id,
		status,
	}: UpdateBridgeTransactionDto): Promise<BridgeTransactionDto> {
		let entity = await this.bridgeTransactionRepository.findOne({
			where: { id },
		});
		if (!entity) {
			throw new NotFoundException();
		}

		entity.status = status;
		if (
			entity.status === TransactionStatusEnum.Success ||
			entity.status === TransactionStatusEnum.Failed
		) {
			entity.finishedAt = new Date();
		}
		entity = await this.bridgeTransactionRepository.save(entity);

		return this.mapToReponse(entity);
	}

	private mapToReponse(entity: BridgeTransaction): BridgeTransactionDto {
		const response = new BridgeTransactionDto();
		response.id = entity.id;
		response.senderAddress = entity.senderAddress;
		response.receiverAddress = entity.receiverAddress;
		response.destinationChain = entity.destinationChain;
		response.originChain = entity.originChain;
		response.amount = entity.amount;
		response.status = entity.status;
		response.createdAt = entity.createdAt;
		response.finishedAt = entity.finishedAt;
		return response;
	}
}
