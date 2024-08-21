import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import {
	Between,
	FindOptionsOrder,
	FindOptionsWhere,
	In,
	LessThanOrEqual,
	Like,
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
	GetBridgingRequestStatesModel,
	getCentralizedBridgingRequestStates,
	mapBridgeTransactionToResponse,
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

		return mapBridgeTransactionToResponse(entity);
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

		if (model.receiverAddress) {
			where.receiverAddresses = Like(model.receiverAddress);
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
			items: entities.map((entity) => mapBridgeTransactionToResponse(entity)),
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
			for (const chain of Object.values(ChainEnum)) {
				const entities = await this.bridgeTransactionRepository.find({
					where: {
						status: In(BridgingRequestNotFinalStates),
						originChain: chain,
					},
				});
				if (entities.length > 0) {
					const models: GetBridgingRequestStatesModel[] = [];
					const modelsCentralized: GetBridgingRequestStatesModel[] = [];
					for (const entity of entities) {
						const arr = entity.isCentralized ? modelsCentralized : models;
						arr.push({
							txHash: entity.sourceTxHash,
							destinationChainId: entity.destinationChain,
						});
					}

					const [states, statesCentralized] = await Promise.all([
						getBridgingRequestStates(chain, models),
						getCentralizedBridgingRequestStates(chain, modelsCentralized),
					]);

					const updatedBridgeTransactions = updateBridgeTransactionStates(
						entities,
						{ ...states, ...statesCentralized },
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
}
