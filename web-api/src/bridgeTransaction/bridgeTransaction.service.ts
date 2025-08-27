import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
	getHasTxFailedRequestStates,
	GetLayerZeroBridgingRequestStatesModel,
	getLayerZeroRequestStates,
	mapBridgeTransactionToResponse,
	updateBridgeTransactionStates,
} from './bridgeTransaction.helper';
import { ChainExtendedEnum, TransactionStatusEnum } from 'src/common/enum';

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

		if (model.nativeTokenAmountFrom && model.nativeTokenAmountTo) {
			where.nativeTokenAmount = Between(
				model.nativeTokenAmountFrom,
				model.nativeTokenAmountTo,
			);
		} else if (model.nativeTokenAmountFrom) {
			where.nativeTokenAmount = MoreThanOrEqual(model.nativeTokenAmountFrom);
		} else if (model.nativeTokenAmountTo) {
			where.nativeTokenAmount = LessThanOrEqual(model.nativeTokenAmountTo);
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
			for (const chain of Object.values(ChainExtendedEnum)) {
				const entities = await this.bridgeTransactionRepository.find({
					where: {
						status: In(BridgingRequestNotFinalStates),
						originChain: chain,
					},
				});
				if (entities.length > 0) {
					const models: GetBridgingRequestStatesModel[] = [];
					const modelsPending: GetBridgingRequestStatesModel[] = [];
					const modelsCentralized: GetBridgingRequestStatesModel[] = [];
					const modelsLayerZero: GetLayerZeroBridgingRequestStatesModel[] = [];
					for (const entity of entities) {
						// handle layer zero
						if (entity.isLayerZero) {
							modelsLayerZero.push({
								txHash: entity.sourceTxHash,
							});

							continue;
						}

						const model: GetBridgingRequestStatesModel = {
							txHash: entity.sourceTxHash,
							destinationChainId: entity.destinationChain,
							txRaw: entity.txRaw,
						};

						const arr = entity.isCentralized ? modelsCentralized : models;
						arr.push(model);

						if (
							entity.status === TransactionStatusEnum.Pending &&
							!!entity.txRaw &&
							!entity.isCentralized
						) {
							modelsPending.push(model);
						}
					}

					const [states, statesCentralized, statesTxFailed, stateslayerZero] = await Promise.all(
						[
							getBridgingRequestStates(chain, models),
							getCentralizedBridgingRequestStates(chain, modelsCentralized),
							getHasTxFailedRequestStates(chain, modelsPending),
							getLayerZeroRequestStates(modelsLayerZero),
						],
					);

					Object.keys(states).length > 0 &&
						Logger.debug(
							`updateStatuses - got bridging request states: ${JSON.stringify(states)}`,
						);
					Object.keys(statesCentralized).length > 0 &&
						Logger.debug(
							`updateStatuses - got centralized bridging request states: ${JSON.stringify(statesCentralized)}`,
						);
					Object.keys(statesTxFailed).length > 0 &&
						Logger.debug(
							`updateStatuses - got has tx failed request states: ${JSON.stringify(statesTxFailed)}`,
						);
					Object.keys(stateslayerZero).length > 0 &&
						Logger.debug(
							`updateStatuses - got bridging request states from layer zero: ${JSON.stringify(stateslayerZero)}`,
						);

					const updatedBridgeTransactions = updateBridgeTransactionStates(
						entities,
						{ ...states, ...statesCentralized, ...stateslayerZero },
						statesTxFailed,
					);

					Object.keys(updatedBridgeTransactions).length > 0 &&
						Logger.debug(
							`updateStatuses - updatedBridgeTransactions: ${JSON.stringify(updatedBridgeTransactions)}`,
						);

					await this.bridgeTransactionRepository.save(
						updatedBridgeTransactions,
					);
				}
			}
		} finally {
			job.start();

			Logger.debug('Job updateStatusesJob executed');
		}
	}
}
