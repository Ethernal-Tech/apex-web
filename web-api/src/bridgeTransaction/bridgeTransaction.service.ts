import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import {
	Between,
	FindOptionsOrder,
	FindOptionsWhere,
	In,
	LessThanOrEqual,
	MoreThanOrEqual,
	Repository,
} from 'typeorm';
import { BridgeTransaction } from './bridgeTransaction.entity';
import {
	BridgeTransactionDto,
	BridgeTransactionFilterDto,
	BridgeTransactionResponseDto,
} from './bridgeTransaction.dto';
import {
	BridgingRequestNotFinalStates,
	getBridgingRequestStates,
	updateBridgeTransactionStates,
} from './bridgeTransaction.helper';
import { ChainEnum } from 'src/common/enum';

@Injectable()
export class BridgeTransactionService {
	constructor(
		@InjectRepository(BridgeTransaction)
		private readonly bridgeTransactionRepository: Repository<BridgeTransaction>,
		private readonly schedulerRegistry: SchedulerRegistry,
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

	async getAllFiltered(
		model: BridgeTransactionFilterDto,
	): Promise<BridgeTransactionResponseDto> {
		const where: FindOptionsWhere<BridgeTransaction> = {
			destinationChain: model.destinationChain,
			senderAddress: model.senderAddress,
			originChain: model.originChain,
		};

		if (model.amountFrom && model.amountTo) {
			where.amount = Between(model.amountFrom, model.amountTo);
		} else if (model.amountFrom) {
			where.amount = MoreThanOrEqual(model.amountFrom);
		} else if (model.amountTo) {
			where.amount = LessThanOrEqual(model.amountTo);
		}

		const page = model.page || 0;
		const take = model.perPage || 10;
		const skip = page * take;

		let order: FindOptionsOrder<BridgeTransaction> | undefined = {
			createdAt: 'desc',
		};
		if (model.orderBy && model.order) {
			order = { [model.orderBy]: model.order };
		}

		const [entities, total] =
			await this.bridgeTransactionRepository.findAndCount({
				where,
				take,
				skip,
				order,
			});

		return {
			items: entities.map((entity) => this.mapToReponse(entity)),
			page: page,
			perPage: take,
			total: total,
		};
	}

	// every 10 seconds
	@Cron('*/10 * * * * *', { name: 'updateStatusesJob' })
	async updateStatuses(): Promise<void> {
		const job = this.schedulerRegistry.getCronJob('updateStatusesJob');
		job.stop();
		try {
			const chains = [ChainEnum.Prime, ChainEnum.Vector];
			for (const chain of chains) {
				const entities = await this.bridgeTransactionRepository.find({
					where: {
						status: In(BridgingRequestNotFinalStates),
					},
				});
				if (entities.length > 0) {
					const notFinalStateTxHashes = entities.map(
						(entity) => entity.sourceTxHash,
					);

					const bridgingRequestStates = await getBridgingRequestStates(
						chain,
						notFinalStateTxHashes,
					);

					const updatedBridgeTransactions = updateBridgeTransactionStates(
						entities,
						bridgingRequestStates,
					);
					await this.bridgeTransactionRepository.save(
						updatedBridgeTransactions,
					);
				}
			}
		} finally {
			job.start();
			console.log('Job updateStatusesJob executed');
		}
	}

	private mapToReponse(entity: BridgeTransaction): BridgeTransactionDto {
		const response = new BridgeTransactionDto();
		response.id = entity.id;
		response.senderAddress = entity.senderAddress;
		response.receiverAddresses = entity.receiverAddresses;
		response.destinationChain = entity.destinationChain;
		response.originChain = entity.originChain;
		response.amount = entity.amount;
		response.sourceTxHash = entity.sourceTxHash;
		response.destinationTxHash = entity.destinationTxHash;
		response.status = entity.status;
		response.createdAt = entity.createdAt;
		response.finishedAt = entity.finishedAt;
		return response;
	}
}
