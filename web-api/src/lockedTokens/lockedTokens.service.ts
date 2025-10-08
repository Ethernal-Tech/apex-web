import {
	BadRequestException,
	Inject,
	Injectable,
	Logger,
} from '@nestjs/common';
import {
	LockedTokensResponse,
	TransferredTokensByDay,
} from './lockedTokens.dto';
import axios, { AxiosError } from 'axios';
import { ErrorResponseDto } from 'src/transaction/transaction.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { Brackets, Repository } from 'typeorm';
import {
	BridgingModeEnum,
	ChainEnum,
	GroupByTimePeriod,
	TransactionStatusEnum,
} from 'src/common/enum';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SettingsService } from 'src/settings/settings.service';
import { getBridgingMode, getBridgingSettings } from 'src/utils/chainUtils';

@Injectable()
export class LockedTokensService {
	constructor(
		@InjectRepository(BridgeTransaction)
		private readonly bridgeTransactionRepository: Repository<BridgeTransaction>,
		@Inject(CACHE_MANAGER) private cacheManager: Cache,
		private readonly settingsService: SettingsService,
	) {}

	async onModuleInit() {
		await this.init();
	}

	endpointUrl: string;
	apiKey = process.env.CARDANO_API_SKYLINE_API_KEY;

	async init() {
		this.endpointUrl =
			process.env.CARDANO_API_SKYLINE_URL + `/api/CardanoTx/GetLockedTokens`;
	}

	public async getLockedTokens(): Promise<LockedTokensResponse> {
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

	public async sumTransferredTokensPerChain(
		allowedBridgingModes: BridgingModeEnum[],
	): Promise<LockedTokensResponse> {
		const cacheKey = 'transferredTokensPerChainNestedMap';
		const cached = await this.cacheManager.get<LockedTokensResponse>(cacheKey);

		if (cached !== undefined) {
			return cached;
		}

		const chains = Object.values(ChainEnum);
		const result = new LockedTokensResponse();
		result.chains = {};

		for (const srcChain of chains) {
			const chainResult: Record<string, bigint> = {};

			for (const dstChain of chains) {
				const bridgingMode = getBridgingMode(
					srcChain,
					dstChain,
					this.settingsService.SettingsResponse,
				);
				if (!bridgingMode || !allowedBridgingModes.includes(bridgingMode)) {
					continue;
				}

				const isLayerZero = bridgingMode == BridgingModeEnum.LayerZero;
				const amount = await this.getAggregatedSum(
					srcChain,
					dstChain,
					'amount',
					isLayerZero,
				);

				chainResult['amount'] =
					(chainResult['amount'] || BigInt(0)) + BigInt(amount || '0');

				const settings = getBridgingSettings(
					srcChain,
					dstChain,
					this.settingsService.SettingsResponse,
				);
				const token = settings?.cardanoChainsNativeTokens[srcChain]?.find(
					(x) => x.dstChainID === dstChain,
				);

				if (!!token) {
					const tokenName = token.tokenName.trim();
					const tokenAmount = await this.getAggregatedSum(
						srcChain,
						dstChain,
						'nativeTokenAmount',
						isLayerZero,
					);
					chainResult[tokenName] =
						(chainResult[tokenName] || BigInt(0)) + BigInt(tokenAmount || '0');
				}
			}

			const entries = Object.entries(chainResult);
			if (entries.length > 0) {
				result.chains[srcChain] = entries.reduce(
					(prev, [tokenName, value]) => {
						prev[tokenName] = value.toString();
						return prev;
					},
					{} as Record<string, string>,
				);
			}
		}

		await this.cacheManager.set(cacheKey, result, 30);

		return result;
	}

	public async sumOfTransferredTokenByDate(
		startDate: Date,
		endDate: Date,
		groupBy: GroupByTimePeriod,
		allowedBridgingModes: BridgingModeEnum[],
	): Promise<TransferredTokensByDay[]> {
		const rawResults = await this.fetchGroupedTransactionSums(
			startDate,
			endDate,
			groupBy,
			allowedBridgingModes,
		);
		return this.transformRawResultsToDto(rawResults, groupBy);
	}

	private async fetchGroupedTransactionSums(
		startDate: Date,
		endDate: Date,
		groupBy: GroupByTimePeriod,
		allowedBridgingModes: BridgingModeEnum[],
	): Promise<any[]> {
		if (!allowedBridgingModes?.length) {
			return [];
		}

		const chains = Object.values(ChainEnum);
		const dateTruncUnit = groupBy.toLowerCase();

		const query = this.bridgeTransactionRepository
			.createQueryBuilder('tx')
			.select(
				`TIMEZONE('UTC', DATE_TRUNC(:truncUnit, tx.finishedAt))`,
				'groupedDate',
			)
			.addSelect('tx.originChain', 'chain')
			.addSelect('SUM(tx.amount)', 'amountSum')
			.addSelect('SUM(tx.nativeTokenAmount)', 'nativeSum')
			.where('tx.status = :status', {
				status: TransactionStatusEnum.ExecutedOnDestination,
			})
			.andWhere('tx.finishedAt >= :start AND tx.finishedAt < :end', {
				start: startDate,
				end: endDate,
			})
			.andWhere('tx.isLayerZero = :isLZ', { isLZ: false });

		query.andWhere(
			new Brackets((qb) => {
				let isFirst = true;

				for (const srcChain of chains) {
					for (const dstChain of chains) {
						const bridgingMode = getBridgingMode(
							srcChain,
							dstChain,
							this.settingsService.SettingsResponse,
						);
						if (!bridgingMode || !allowedBridgingModes.includes(bridgingMode)) {
							continue;
						}

						if (isFirst) {
							isFirst = false;
							qb.where(
								'(t.originChain = :srcChain AND t.destinationChain = :dstChain)',
								{ srcChain, dstChain },
							);
						} else {
							qb.orWhere(
								'(t.originChain = :srcChain AND t.destinationChain = :dstChain)',
								{ srcChain, dstChain },
							);
						}
					}
				}
			}),
		);

		query
			.setParameter('truncUnit', dateTruncUnit)
			.groupBy(`TIMEZONE('UTC', DATE_TRUNC(:truncUnit, tx.finishedAt))`)
			.addGroupBy('tx.originChain')
			.orderBy(`TIMEZONE('UTC', DATE_TRUNC(:truncUnit, tx.finishedAt))`, 'ASC');

		return query.getRawMany();
	}

	private transformRawResultsToDto(
		rawResults: any[],
		groupBy: GroupByTimePeriod,
	): TransferredTokensByDay[] {
		const groupedByDate: Record<string, TransferredTokensByDay> = {};

		for (const row of rawResults) {
			const normalizedDate = this.normalizeGroupedDate(
				new Date(row.groupedDate),
				groupBy,
			);
			const dateKey = normalizedDate.toISOString();

			const chain: string = row.chain;
			const amountSum: string = row.amountSum;
			const nativeSum: string = row.nativeSum;

			const tokens =
				this.settingsService.SettingsResponse.settingsPerMode[
					BridgingModeEnum.Skyline
				].cardanoChainsNativeTokens?.[chain];
			const tokenName = tokens && Object.values(tokens)[0]?.tokenName?.trim();

			if (!groupedByDate[dateKey]) {
				groupedByDate[dateKey] = {
					date: normalizedDate,
					totalTransferred: {},
				};
			}

			const chainResult: Record<string, string> = {};

			if (amountSum !== null) {
				chainResult.amount = amountSum;
			}

			if (tokenName && nativeSum !== null) {
				chainResult[tokenName] = nativeSum;
			}

			groupedByDate[dateKey].totalTransferred[chain] = chainResult;
		}

		return Object.values(groupedByDate).sort(
			(a, b) => a.date.getTime() - b.date.getTime(),
		);
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
		isLayerZero: boolean,
		status: TransactionStatusEnum = TransactionStatusEnum.ExecutedOnDestination,
	): Promise<string> {
		const query = this.bridgeTransactionRepository
			.createQueryBuilder('tx')
			.select(`SUM(tx.${fieldName})`, 'sumAll')
			.where('tx.status = :status', { status })
			.andWhere('tx.originChain = :srcChain', { srcChain })
			.andWhere('tx.destinationChain = :dstChain', { dstChain })
			.andWhere('tx.isLayerZero = :isLayerZero', { isLayerZero });
		const { sumAll } = await query.getRawOne();
		return sumAll;
	}
}
