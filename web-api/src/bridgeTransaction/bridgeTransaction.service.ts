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
import {
	BridgingModeEnum,
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

		if (model.onlyReactor) {
			if (!model.destinationChain) {
				where.destinationChain = In([
					ChainEnum.Prime,
					ChainEnum.Vector,
					ChainEnum.Nexus,
				]);
			}

			if (!model.originChain) {
				where.originChain = In([
					ChainEnum.Prime,
					ChainEnum.Vector,
					ChainEnum.Nexus,
				]);
			}

			where.tokenID = 0;
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
}
