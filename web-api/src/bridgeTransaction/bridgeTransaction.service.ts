import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import {
	Between,
	FindOptionsOrder,
	FindOptionsWhere,
	In,
	IsNull,
	LessThan,
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
import {
	BridgingModeEnum,
	BridgeTxDisplayStatusEnum,
	ChainEnum,
	TransactionStatusEnum,
} from 'src/common/enum';
import { getBridgingMode } from 'src/utils/chainUtils';
import { SettingsService } from 'src/settings/settings.service';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { getRealTokenIDFromEntity } from './utils';

@Injectable()
export class BridgeTransactionService {
	constructor(
		@InjectRepository(BridgeTransaction)
		private readonly bridgeTransactionRepository: Repository<BridgeTransaction>,
		private readonly settingsService: SettingsService,
		private readonly schedulerRegistry: SchedulerRegistry,
		private readonly appConfig: AppConfigService,
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
		const baseWhere: Omit<
			FindOptionsWhere<BridgeTransaction>,
			'activeFrom'
		> = {};

		if (model.destinationChain) {
			baseWhere.destinationChain = model.destinationChain;
		}
		if (model.senderAddress) {
			baseWhere.senderAddress = model.senderAddress;
		}
		if (model.originChain) {
			baseWhere.originChain = model.originChain;
		}

		if (model.amountFrom && model.amountTo) {
			baseWhere.amountWei = Between(model.amountFrom, model.amountTo);
		} else if (model.amountFrom) {
			baseWhere.amountWei = MoreThanOrEqual(model.amountFrom);
		} else if (model.amountTo) {
			baseWhere.amountWei = LessThanOrEqual(model.amountTo);
		}

		if (model.nativeTokenAmountFrom && model.nativeTokenAmountTo) {
			baseWhere.tokenAmountWei = Between(
				model.nativeTokenAmountFrom,
				model.nativeTokenAmountTo,
			);
		} else if (model.nativeTokenAmountFrom) {
			baseWhere.tokenAmountWei = MoreThanOrEqual(model.nativeTokenAmountFrom);
		} else if (model.nativeTokenAmountTo) {
			baseWhere.tokenAmountWei = LessThanOrEqual(model.nativeTokenAmountTo);
		}

		if (model.receiverAddress) {
			baseWhere.receiverAddresses = Like(model.receiverAddress);
		}

		if (model.onlyReactor) {
			if (!model.destinationChain) {
				baseWhere.destinationChain = In([
					ChainEnum.Prime,
					ChainEnum.Vector,
					ChainEnum.Nexus,
				]);
			}

			if (!model.originChain) {
				baseWhere.originChain = In([
					ChainEnum.Prime,
					ChainEnum.Vector,
					ChainEnum.Nexus,
				]);
			}

			baseWhere.tokenID = 0;
		}

		applyDisplayStatusFilter(baseWhere, model.displayStatus);

		const where: FindOptionsWhere<BridgeTransaction>[] = [
			{
				...baseWhere,
				activeFrom: IsNull(),
			},
			{
				...baseWhere,
				activeFrom: LessThan(new Date()),
			},
		];

		const page = model.page || 0;
		const take = model.perPage || 10;
		const skip = page * take;

		const orderColumn = resolveOrderByColumn(model.orderBy);
		const orderDirection = model.order === 'asc' ? 'asc' : 'desc';

		const [entities, total] =
			orderColumn === 'status'
				? await this.findFilteredOrderedByDisplayStatus(
						where,
						skip,
						take,
						orderDirection,
					)
				: await this.bridgeTransactionRepository.findAndCount({
						where,
						take,
						skip,
						order: this.buildColumnOrder(orderColumn, orderDirection),
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
		if (this.appConfig.features.statusUpdateModesSupported.length === 0) {
			Logger.warn('cronjob CRONJOB_MODES_SUPPORTED not set');
			return;
		}

		const modesSupported = new Set<string>(
			this.appConfig.features.statusUpdateModesSupported,
		);

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
					const modelsReactor: GetBridgingRequestStatesModel[] = [];
					const modelsPendingReactor: GetBridgingRequestStatesModel[] = [];
					const modelsSkyline: GetBridgingRequestStatesModel[] = [];
					const modelsPendingSkyline: GetBridgingRequestStatesModel[] = [];
					const modelsCentralized: GetBridgingRequestStatesModel[] = [];
					const modelsLayerZero: GetLayerZeroBridgingRequestStatesModel[] = [];
					for (const entity of entities) {
						// handle layer zero
						if (entity.isLayerZero) {
							if (modesSupported.has(BridgingModeEnum.LayerZero)) {
								modelsLayerZero.push({
									txHash: entity.sourceTxHash,
								});
							}

							continue;
						}

						const model: GetBridgingRequestStatesModel = {
							txHash: entity.sourceTxHash,
							destinationChainId: entity.destinationChain,
							txRaw: entity.txRaw,
						};

						if (entity.isCentralized) {
							if (modesSupported.has(BridgingModeEnum.Centralized)) {
								modelsCentralized.push(model);
							}
						} else {
							const tokenID = getRealTokenIDFromEntity(
								this.settingsService.SettingsResponse.directionConfig,
								entity,
							);
							if (!tokenID) {
								Logger.error(
									`failed to get real tokenID for entity: ${entity.originChain} ${entity.sourceTxHash}`,
								);

								return;
							}

							const bridgingMode = getBridgingMode(
								entity.originChain,
								entity.destinationChain,
								tokenID,
								this.settingsService.SettingsResponse,
							);
							if (!bridgingMode) {
								continue;
							}

							if (bridgingMode === BridgingModeEnum.Skyline) {
								if (modesSupported.has(BridgingModeEnum.Skyline)) {
									modelsSkyline.push(model);
								}
							} else {
								if (modesSupported.has(BridgingModeEnum.Reactor)) {
									modelsReactor.push(model);
								}
							}

							if (
								entity.status === TransactionStatusEnum.Pending &&
								!!entity.txRaw
							) {
								if (bridgingMode === BridgingModeEnum.Skyline) {
									if (modesSupported.has(BridgingModeEnum.Skyline)) {
										modelsPendingSkyline.push(model);
									}
								} else {
									if (modesSupported.has(BridgingModeEnum.Reactor)) {
										modelsPendingReactor.push(model);
									}
								}
							}
						}
					}

					const [
						statesSkyline,
						statesReactor,
						statesCentralized,
						statesTxFailedSkyline,
						statesTxFailedReactor,
						stateslayerZero,
					] = await Promise.all([
						getBridgingRequestStates(
							chain,
							BridgingModeEnum.Skyline,
							modelsSkyline,
						),
						getBridgingRequestStates(
							chain,
							BridgingModeEnum.Reactor,
							modelsReactor,
						),
						getCentralizedBridgingRequestStates(chain, modelsCentralized),
						getHasTxFailedRequestStates(
							chain,
							BridgingModeEnum.Skyline,
							modelsPendingSkyline,
						),
						getHasTxFailedRequestStates(
							chain,
							BridgingModeEnum.Reactor,
							modelsPendingReactor,
						),
						getLayerZeroRequestStates(modelsLayerZero),
					]);

					Object.keys(statesSkyline).length > 0 &&
						Logger.debug(
							`updateStatuses - got bridging request states skyline: ${JSON.stringify(statesSkyline)}`,
						);
					Object.keys(statesReactor).length > 0 &&
						Logger.debug(
							`updateStatuses - got bridging request states reactor: ${JSON.stringify(statesReactor)}`,
						);
					Object.keys(statesCentralized).length > 0 &&
						Logger.debug(
							`updateStatuses - got centralized bridging request states: ${JSON.stringify(statesCentralized)}`,
						);
					Object.keys(statesTxFailedSkyline).length > 0 &&
						Logger.debug(
							`updateStatuses - got has tx failed request states skyline: ${JSON.stringify(statesTxFailedSkyline)}`,
						);
					Object.keys(statesTxFailedReactor).length > 0 &&
						Logger.debug(
							`updateStatuses - got has tx failed request states reactor: ${JSON.stringify(statesTxFailedReactor)}`,
						);
					Object.keys(stateslayerZero).length > 0 &&
						Logger.debug(
							`updateStatuses - got bridging request states from layer zero: ${JSON.stringify(stateslayerZero)}`,
						);

					const updatedBridgeTransactions = updateBridgeTransactionStates(
						entities,
						{
							...statesSkyline,
							...statesReactor,
							...statesCentralized,
							...stateslayerZero,
						},
						{ ...statesTxFailedReactor, ...statesTxFailedSkyline },
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

	private buildColumnOrder(
		orderColumn: keyof BridgeTransaction,
		orderDirection: 'asc' | 'desc',
	): FindOptionsOrder<BridgeTransaction> {
		if (orderColumn === 'finishedAt') {
			return {
				finishedAt: {
					direction: orderDirection,
					nulls: 'LAST',
				},
			};
		}
		return { [orderColumn]: orderDirection };
	}

	/**
	 * History shows success vs refunded (and pending vs refunding) from
	 * `status` + `isRefund`. Sorting the raw `status` column interleaves them.
	 * Rank matches the UI labels alphabetically: failed, pending, refunded,
	 * refunding, success.
	 */
	private findFilteredOrderedByDisplayStatus(
		where: FindOptionsWhere<BridgeTransaction>[],
		skip: number,
		take: number,
		orderDirection: 'asc' | 'desc',
	): Promise<[BridgeTransaction[], number]> {
		const direction = orderDirection.toUpperCase() as 'ASC' | 'DESC';
		const qb = this.bridgeTransactionRepository.createQueryBuilder('tx');
		qb.setFindOptions({ where, skip, take });
		qb.orderBy(
			`CASE
				WHEN tx.status = :invalidRequest THEN 0
				WHEN tx.isRefund = true AND tx.status = :executed THEN 2
				WHEN tx.isRefund = true THEN 3
				WHEN tx.status = :executed THEN 4
				ELSE 1
			END`,
			direction,
		).setParameters({
			invalidRequest: TransactionStatusEnum.InvalidRequest,
			executed: TransactionStatusEnum.ExecutedOnDestination,
		});
		return qb.getManyAndCount();
	}
}

function applyDisplayStatusFilter(
	baseWhere: FindOptionsWhere<BridgeTransaction>,
	displayStatus?: BridgeTxDisplayStatusEnum,
) {
	if (!displayStatus) {
		return;
	}

	switch (displayStatus) {
		case BridgeTxDisplayStatusEnum.Success:
			baseWhere.status = TransactionStatusEnum.ExecutedOnDestination;
			baseWhere.isRefund = false;
			return;
		case BridgeTxDisplayStatusEnum.Failed:
			baseWhere.status = TransactionStatusEnum.InvalidRequest;
			return;
		case BridgeTxDisplayStatusEnum.Pending:
			baseWhere.status = In(BridgingRequestNotFinalStates);
			baseWhere.isRefund = false;
			return;
		case BridgeTxDisplayStatusEnum.Refunded:
			baseWhere.status = TransactionStatusEnum.ExecutedOnDestination;
			baseWhere.isRefund = true;
			return;
		case BridgeTxDisplayStatusEnum.Refunding:
			baseWhere.status = In(BridgingRequestNotFinalStates);
			baseWhere.isRefund = true;
			return;
	}
}

const ORDER_BY_COLUMNS: Record<string, keyof BridgeTransaction> = {
	createdAt: 'createdAt',
	finishedAt: 'finishedAt',
	originChain: 'originChain',
	destinationChain: 'destinationChain',
	status: 'status',
	senderAddress: 'senderAddress',
	receiverAddresses: 'receiverAddresses',
	amount: 'amountWei',
	amountWei: 'amountWei',
	nativeTokenAmount: 'tokenAmountWei',
	tokenAmountWei: 'tokenAmountWei',
};

function resolveOrderByColumn(orderBy?: string): keyof BridgeTransaction {
	return (orderBy && ORDER_BY_COLUMNS[orderBy]) || 'createdAt';
}
