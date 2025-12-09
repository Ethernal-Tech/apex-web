import {
	BadRequestException,
	Inject,
	Injectable,
	Logger,
} from '@nestjs/common';
import {
	LockedTokensDto,
	LockedTokensResponse,
	TransferredTokensByDay,
	TransferredTokensResponse,
} from './lockedTokens.dto';
import axios, { AxiosError } from 'axios';
import { ErrorResponseDto } from 'src/transaction/transaction.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { Repository } from 'typeorm';
import {
	BridgingModeEnum,
	ChainEnum,
	GroupByTimePeriod,
	TransactionStatusEnum,
} from 'src/common/enum';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SettingsService } from 'src/settings/settings.service';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { BridgingSettingsDirectionConfigDto } from 'src/settings/settings.dto';
import {
	getCurrencyIDFromDirectionConfig,
	getWrappedCurrencyIDFromDirectionConfig,
	getDirectionTokenIDsFromDirectionConfig,
} from 'src/settings/utils';
import { amountToBigInt } from 'src/utils/generalUtils';
import { getBridgingMode } from 'src/utils/chainUtils';

@Injectable()
export class LockedTokensService {
	constructor(
		@InjectRepository(BridgeTransaction)
		private readonly bridgeTransactionRepository: Repository<BridgeTransaction>,
		@Inject(CACHE_MANAGER) private cacheManager: Cache,
		private readonly settingsService: SettingsService,
		private readonly appConfig: AppConfigService,
	) {}

	onModuleInit() {
		this.init();
	}

	endpointUrl: string;
	apiKey = process.env.CARDANO_API_SKYLINE_API_KEY;

	init() {
		this.endpointUrl =
			this.appConfig.cardanoSkylineApiUrl + `/api/CardanoTx/GetLockedTokens`;
	}

	public async fillTokensData(
		allowedBridgingModes: BridgingModeEnum[],
	): Promise<LockedTokensDto> {
		const lockedTokens = await this.getLockedTokens();
		const sumTransferred = await this.sumTransferredTokensPerChain(
			this.settingsService.SettingsResponse.directionConfig,
			allowedBridgingModes,
		);

		return {
			chains: lockedTokens.chains,
			totalTransferred: sumTransferred.totalTransferred,
		};
	}

	private async getLockedTokens(): Promise<LockedTokensResponse> {
		Logger.debug(`axios.get: ${this.endpointUrl}`);

		try {
			const response = await axios.get(this.endpointUrl, {
				headers: {
					'X-API-KEY': this.apiKey,
					'Content-Type': 'application/json',
				},
			});

			Logger.debug(`axios.response: ${JSON.stringify(response.data)}`);

			return response.data as LockedTokensResponse;
		} catch (error) {
			if (error instanceof AxiosError) {
				if (error.response) {
					throw new BadRequestException(
						error.response.data as ErrorResponseDto,
					);
				}
			}

			throw new BadRequestException();
		}
	}

	public sumOfTransferredTokenByDate(
		_startDate: Date,
		_endDate: Date,
		_groupBy: GroupByTimePeriod,
		_allowedBridgingModes: BridgingModeEnum[],
	): TransferredTokensByDay[] {
		return [];
	}

	private async sumTransferredTokensPerChain(
		directionConfig: {
			[key: string]: BridgingSettingsDirectionConfigDto;
		},
		allowedBridgingModes: BridgingModeEnum[],
	): Promise<TransferredTokensResponse> {
		const cacheKey = 'transferredTokensPerChainNestedMap';
		const cached =
			await this.cacheManager.get<TransferredTokensResponse>(cacheKey);

		if (cached !== undefined) {
			return cached;
		}

		const result = new TransferredTokensResponse();
		result.totalTransferred = {};

		for (const [srcChain, config] of Object.entries(directionConfig)) {
			for (const dstChain of Object.keys(config.destChain)) {
				const tokenIds = getDirectionTokenIDsFromDirectionConfig(
					directionConfig,
					srcChain,
					dstChain,
				);

				const currency = getCurrencyIDFromDirectionConfig(
					directionConfig,
					srcChain,
				);

				const currencyIndex = tokenIds.indexOf(currency!);

				const isCurrencyContained = currencyIndex !== -1;

				if (isCurrencyContained) {
					tokenIds.splice(currencyIndex, 1);
				}

				if (tokenIds && tokenIds.length > 0) {
					for (const tokenID of tokenIds) {
						const bridgingMode = getBridgingMode(
							srcChain as ChainEnum,
							dstChain as ChainEnum,
							tokenID,
							this.settingsService.SettingsResponse,
						);

						if (!allowedBridgingModes.includes(bridgingMode!)) continue;

						const nativeTokenAmount = await this.getAggregatedSum(
							srcChain,
							dstChain,
							'nativeTokenAmount',
							tokenID,
							true,
						);

						if (!result.totalTransferred[srcChain]) {
							result.totalTransferred[srcChain] = {};
						}

						if (!result.totalTransferred[srcChain][tokenID]) {
							result.totalTransferred[srcChain][tokenID] = '0';
						}
						result.totalTransferred[srcChain] ??= {};
						result.totalTransferred[srcChain][tokenID] = (
							BigInt(result.totalTransferred[srcChain][tokenID] ?? '0') +
							amountToBigInt(nativeTokenAmount, srcChain as ChainEnum)
						).toString();

						if (BigInt(result.totalTransferred[srcChain][tokenID] ?? '0') > 0) {
							const amount = await this.getAggregatedSum(
								srcChain,
								dstChain,
								'amount',
								tokenID,
								true, // sum only the amounts where nativeTokenAmount is greater than zero
							);

							if (currency) {
								result.totalTransferred[srcChain] ??= {};
								result.totalTransferred[srcChain][currency] = (
									BigInt(result.totalTransferred[srcChain][currency] ?? '0') +
									amountToBigInt(amount, srcChain as ChainEnum)
								).toString();
							}
						}

						// backward compatibility
						if (
							getWrappedCurrencyIDFromDirectionConfig(
								directionConfig,
								srcChain,
							) == tokenID
						) {
							const nativeTokenAmountZeroId = await this.getAggregatedSum(
								srcChain,
								dstChain,
								'nativeTokenAmount',
								0,
								true,
							);

							result.totalTransferred[srcChain][tokenID] = (
								BigInt(result.totalTransferred[srcChain][tokenID] ?? '0') +
								amountToBigInt(nativeTokenAmountZeroId, srcChain as ChainEnum)
							).toString();

							if (
								BigInt(result.totalTransferred[srcChain][tokenID] ?? '0') > 0
							) {
								const amountZeroId = await this.getAggregatedSum(
									srcChain,
									dstChain,
									'amount',
									0, // All old transactions have a value of 0 for tokenID
									true,
								);

								if (currency) {
									result.totalTransferred[srcChain] ??= {};
									result.totalTransferred[srcChain][currency] = (
										BigInt(result.totalTransferred[srcChain][currency] ?? '0') +
										amountToBigInt(amountZeroId, srcChain as ChainEnum)
									).toString();
								}
							}
						}
					}
				}

				if (isCurrencyContained) {
					const bridgingMode = getBridgingMode(
						srcChain as ChainEnum,
						dstChain as ChainEnum,
						currency!,
						this.settingsService.SettingsResponse,
					);

					if (!allowedBridgingModes.includes(bridgingMode!)) continue;

					const amount = await this.getAggregatedSum(
						srcChain,
						dstChain,
						'amount',
						0,
						false,
					);

					if (currency) {
						result.totalTransferred[srcChain] ??= {};
						result.totalTransferred[srcChain][currency] = (
							BigInt(result.totalTransferred[srcChain][currency] ?? '0') +
							amountToBigInt(amount, srcChain as ChainEnum)
						).toString();
					}
				}
			}
		}

		await this.cacheManager.set(cacheKey, result, 30);

		return result;
	}

	private normalizeGroupedDate(date: Date, groupBy: GroupByTimePeriod): Date {
		switch (groupBy) {
			case GroupByTimePeriod.Year:
				return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));

			case GroupByTimePeriod.Month:
				return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

			case GroupByTimePeriod.Week: {
				const day = date.getUTCDay(); // 0 = Sunday, ..., 6 = Saturday
				const diffToMonday = (day + 6) % 7;
				return new Date(
					Date.UTC(
						date.getUTCFullYear(),
						date.getUTCMonth(),
						date.getUTCDate() - diffToMonday,
					),
				);
			}

			case GroupByTimePeriod.Day:
				return new Date(
					Date.UTC(
						date.getUTCFullYear(),
						date.getUTCMonth(),
						date.getUTCDate(),
						0,
						0,
						0,
						0,
					),
				);

			case GroupByTimePeriod.Hour:
			default:
				return new Date(
					Date.UTC(
						date.getUTCFullYear(),
						date.getUTCMonth(),
						date.getUTCDate(),
						date.getUTCHours(),
						0,
						0,
						0,
					),
				);
		}
	}

	private async getAggregatedSum(
		srcChain: string,
		dstChain: string,
		fieldName: string,
		tokenID: number = 0,
		isNativeToken: boolean = false,
		status: TransactionStatusEnum = TransactionStatusEnum.ExecutedOnDestination,
	): Promise<string> {
		const query = this.bridgeTransactionRepository
			.createQueryBuilder('tx')
			.select(`SUM(tx.${fieldName})`, 'sumAll')
			.where('tx.status = :status', { status })
			.andWhere('tx.originChain = :srcChain', { srcChain })
			.andWhere('tx.destinationChain = :dstChain', { dstChain })
			.andWhere('tx.tokenID = :tokenID', { tokenID });

		if (isNativeToken) {
			query.andWhere('tx.nativeTokenAmount > 0');
		} else {
			query.andWhere('tx.nativeTokenAmount = 0');
		}

		const { sumAll } = await query.getRawOne();
		return sumAll;
	}

	private async getGroupByAggregatedSum(
		startDate: Date,
		endDate: Date,
		srcChain: ChainEnum,
		dstChain: ChainEnum,
		groupBy: GroupByTimePeriod,
		status: TransactionStatusEnum = TransactionStatusEnum.ExecutedOnDestination,
	): Promise<
		Array<{
			groupedDate: string;
			amount: string | null;
			nativeSum: string | null;
			originChain: ChainEnum;
			destinationChain: ChainEnum;
		}>
	> {
		const dateExpr =
			`to_char(DATE_TRUNC(:truncUnit, tx."finishedAt" AT TIME ZONE 'UTC'), ` +
			`'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;

		const qb = this.bridgeTransactionRepository
			.createQueryBuilder('tx')
			.select(dateExpr, 'groupedDate')
			.addSelect('SUM(tx.amount)', 'amount')
			.addSelect('SUM(tx.nativeTokenAmount)', 'nativeSum')
			.addSelect('tx.originChain', 'originChain')
			.addSelect('tx.destinationChain', 'destinationChain')
			.where('tx.status = :status', { status })
			.andWhere('tx."finishedAt" >= :start AND tx."finishedAt" < :end', {
				start: startDate,
				end: endDate,
			})
			.andWhere(
				'tx.originChain = :srcChain AND tx.destinationChain = :dstChain',
				{ srcChain, dstChain },
			)
			.setParameter('truncUnit', groupBy.toLowerCase())
			.groupBy(dateExpr)
			.addGroupBy('tx.originChain')
			.addGroupBy('tx.destinationChain')
			.orderBy(dateExpr, 'ASC');

		return qb.getRawMany();
	}
}
