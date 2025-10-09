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
import {
	getAllChainsDirections,
	getTokenNameFromSettings,
	isCardanoChain,
} from 'src/utils/chainUtils';
import { amountToBigInt } from 'src/utils/generalUtils';

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

		const availableDirections = getAllChainsDirections(
			allowedBridgingModes,
			this.settingsService.SettingsResponse,
		);
		const tmpChains = {} as { [key: string]: { [innerKey: string]: bigint } };

		for (const info of availableDirections) {
			const tokenName = getTokenNameFromSettings(
				info.srcChain,
				info.dstChain,
				this.settingsService.SettingsResponse,
			);
			const amount = await this.getAggregatedSum(
				info.srcChain,
				info.dstChain,
				'amount',
			);

			if (!tmpChains[info.srcChain]) {
				tmpChains[info.srcChain] = {
					amount: BigInt(0),
				};
			}

			tmpChains[info.srcChain]['amount'] =
				tmpChains[info.srcChain]['amount'] +
				amountToBigInt(amount, info.srcChain);

			if (!!tokenName) {
				const tokenAmount = await this.getAggregatedSum(
					info.srcChain,
					info.dstChain,
					'nativeTokenAmount',
				);

				if (!tmpChains[info.srcChain][tokenName]) {
					tmpChains[info.srcChain][tokenName] = BigInt(0);
				}

				tmpChains[info.srcChain][tokenName] =
					tmpChains[info.srcChain][tokenName] +
					amountToBigInt(tokenAmount, info.srcChain);
			}
		}

		const result = new LockedTokensResponse();
		result.chains = Object.entries(tmpChains).reduce(
			(chainsAcc, [chainName, tokens]) => {
				chainsAcc[chainName] = Object.entries(tokens).reduce(
					(tokensAcc, [tokenName, value]) => {
						tokensAcc[tokenName] = value.toString();
						return tokensAcc;
					},
					{} as { [innerKey: string]: string },
				);
				return chainsAcc;
			},
			{} as { [key: string]: { [innerKey: string]: string } },
		);

		await this.cacheManager.set(cacheKey, result, 30);

		return result;
	}

	public async sumOfTransferredTokenByDate(
		startDate: Date,
		endDate: Date,
		groupBy: GroupByTimePeriod,
		allowedBridgingModes: BridgingModeEnum[],
	): Promise<TransferredTokensByDay[]> {
		const availableDirections = getAllChainsDirections(
			allowedBridgingModes,
			this.settingsService.SettingsResponse,
		);

		const fetchResult: {
			groupedDate: string;
			amount: string | null;
			nativeSum: string | null;
			originChain: ChainEnum;
			destinationChain: ChainEnum;
		}[] = [];

		for (const info of availableDirections) {
			const rows = await this.getGroupByAggregatedSum(
				startDate,
				endDate,
				info.srcChain,
				info.dstChain,
				groupBy,
			);
			fetchResult.push(...rows);
		}

		return this.transformRawResultsToDto(fetchResult, groupBy);
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

			const chain = row.originChain;
			const dateKey = normalizedDate.toISOString();
			const amountSum: string = row.amount;
			const nativeSum: string = row.nativeSum;
			const tokenName = getTokenNameFromSettings(
				chain,
				row.destinationChain,
				this.settingsService.SettingsResponse,
			);
			if (!groupedByDate[dateKey]) {
				groupedByDate[dateKey] = {
					date: normalizedDate,
					totalTransferred: {},
				};
			}

			const chainResult: Record<string, string> = {};

			if ((!tokenName || isCardanoChain(chain)) && amountSum !== null) {
				chainResult.amount = amountToBigInt(row.amount, chain).toString();
			}

			if (!!tokenName && nativeSum !== null) {
				chainResult[tokenName] = amountToBigInt(
					row.nativeSum,
					chain,
				).toString();
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
		status: TransactionStatusEnum = TransactionStatusEnum.ExecutedOnDestination,
	): Promise<string> {
		const query = this.bridgeTransactionRepository
			.createQueryBuilder('tx')
			.select(`SUM(tx.${fieldName})`, 'sumAll')
			.where('tx.status = :status', { status })
			.andWhere('tx.originChain = :srcChain', { srcChain })
			.andWhere('tx.destinationChain = :dstChain', { dstChain });
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
