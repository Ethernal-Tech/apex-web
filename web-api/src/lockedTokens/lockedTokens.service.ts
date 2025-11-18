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
	TokenEnum,
	TransactionStatusEnum,
} from 'src/common/enum';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SettingsService } from 'src/settings/settings.service';
import {
	getAllChainsDirections,
	getTokenNameFromSettings,
	isWrapped,
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

	onModuleInit() {
		this.init();
	}

	endpointUrl: string;
	apiKey = process.env.CARDANO_API_SKYLINE_API_KEY;

	init() {
		this.endpointUrl =
			process.env.CARDANO_API_SKYLINE_URL + `/api/CardanoTx/GetLockedTokens`;
	}

	public async fillTokensData(
		allowedBridgingModes: BridgingModeEnum[],
	): Promise<LockedTokensDto> {
		const lockedTokens = await this.getLockedTokens();
		const totalTransferred =
			await this.sumTransferredTokensPerChain(allowedBridgingModes);

		const mappedChains: Record<
			string,
			Partial<Record<TokenEnum, Record<string, string>>>
		> = {};

		const availableDirections = getAllChainsDirections(
			[BridgingModeEnum.Skyline],
			this.settingsService.SettingsResponse,
		);

		for (const chainName in lockedTokens.chains) {
			if (
				Object.prototype.hasOwnProperty.call(lockedTokens.chains, chainName)
			) {
				const tokens = lockedTokens.chains[chainName];
				const mappedTokens: {
					[tokenName: string]: { [address: string]: string };
				} = {};

				for (const token in tokens) {
					if (Object.prototype.hasOwnProperty.call(tokens, token)) {
						const addresses = tokens[token];

						const matchingDstChain = availableDirections.find(
							(d) => d.srcChain === (chainName as ChainEnum),
						);

						if (!matchingDstChain) {
							continue;
						}

						const tokenName = getTokenNameFromSettings(
							chainName as ChainEnum,
							matchingDstChain?.dstChain,
							this.settingsService.SettingsResponse,
							token,
						);

						if (tokenName) {
							mappedTokens[tokenName] = addresses;
						}
					}
				}
				mappedChains[chainName] = mappedTokens;
			}
		}

		return {
			chains: mappedChains,
			totalTransferred: totalTransferred.totalTransferred,
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

	private async sumTransferredTokensPerChain(
		allowedBridgingModes: BridgingModeEnum[],
	): Promise<TransferredTokensResponse> {
		const cacheKey = 'transferredTokensPerChainNestedMap';
		const cached =
			await this.cacheManager.get<TransferredTokensResponse>(cacheKey);

		if (cached !== undefined) {
			return cached;
		}

		const availableDirections = getAllChainsDirections(
			allowedBridgingModes,
			this.settingsService.SettingsResponse,
		);
		const result = new TransferredTokensResponse();
		result.totalTransferred = {};

		for (const info of availableDirections) {
			const tokenName = getTokenNameFromSettings(
				info.srcChain,
				info.dstChain,
				this.settingsService.SettingsResponse,
			);

			if (!tokenName) {
				continue;
			}
			const amount = await this.getAggregatedSum(
				info.srcChain,
				info.dstChain,
				'amount',
			);

			result.totalTransferred[info.srcChain] ??= {};
			result.totalTransferred[info.srcChain][tokenName] = (
				BigInt(result.totalTransferred[info.srcChain][tokenName] ?? '0') +
				amountToBigInt(amount, info.srcChain)
			).toString();

			if (isWrapped(tokenName)) {
				const tokenAmount = await this.getAggregatedSum(
					info.srcChain,
					info.dstChain,
					'nativeTokenAmount',
				);

				if (!result.totalTransferred[info.srcChain][tokenName]) {
					result.totalTransferred[info.srcChain][tokenName] = '0';
				}

				result.totalTransferred[info.srcChain] ??= {};
				result.totalTransferred[info.srcChain][tokenName as TokenEnum] = (
					BigInt(
						result.totalTransferred[info.srcChain][tokenName as TokenEnum] ??
							'0',
					) + amountToBigInt(tokenAmount, info.srcChain)
				).toString();
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

			if (row.amount !== null) {
				chainResult.amount = amountToBigInt(row.amount, chain).toString(10);
			}

			if (!!tokenName && row.nativeSum !== null) {
				chainResult[tokenName] = amountToBigInt(row.nativeSum, chain).toString(
					10,
				);
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
