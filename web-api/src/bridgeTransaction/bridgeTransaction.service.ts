import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionStatusEnum } from 'src/common/enum';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { BridgeTransaction } from './bridgeTransaction.entity';
import {
	CreateBridgeTransactionDto,
	BridgeTransactionDto,
	UpdateBridgeTransactionDto,
	BridgeTransactionFilterDto,
	BridgeTransactionResponseDto,
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

	async getAllFiltered(body: BridgeTransactionFilterDto): Promise<BridgeTransactionResponseDto> {
		const where: {[key: string]: any} = {};

		if (body.destinationChain) {
			where['destinationChain'] = body.destinationChain;
		}
		if (body.receiverAddress) {
			where['receiverAddress'] = body.receiverAddress;
		}
		if (body.amountFrom && body.amountTo) {
			where['amount'] = Between(body.amountFrom, body.amountTo);
		} else if (body.amountFrom) {
			where['amount'] = MoreThanOrEqual(body.amountFrom);
		} else if (body.amountTo) {
			where['amount'] = LessThanOrEqual(body.amountTo);
		}

		const page = body.page ? body.page : 1;
		const perPage = body.perPage ? body.perPage : 10;
		const skip = (page-1) * perPage;
		
		const [entities, total] = await this.bridgeTransactionRepository.findAndCount(
			{
				where: where,
				take: perPage,
				skip: skip,
				order: {
					[body.orderBy]: body.order,
				  },
			}
		);
		
		
		return {
			entities: entities.map((entity) => this.mapToReponse(entity)),
			page: page,
			perPage: perPage,
			total: total,
		};
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
