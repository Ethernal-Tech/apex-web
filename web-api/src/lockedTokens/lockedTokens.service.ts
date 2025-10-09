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
	TokenEnum,
	TransactionStatusEnum,
} from 'src/common/enum';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SettingsService } from 'src/settings/settings.service';
import {
	getAllChainsDirections,
	getTokenNameFromSettings,
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
		const availableDirections = getAllChainsDirections(
			allowedBridgingModes,
			this.settingsService.SettingsResponse,
		);
		if (availableDirections.length == 0) {
			return [];
		}

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
			});

		query.andWhere(
			new Brackets((qb) => {
				for (let id = 0; id < availableDirections.length; id++) {
					const info = availableDirections[id];
					const srcName = `srcChain${id}`;
					const dstName = `dstChain${id}`;
					if (id === 0) {
						qb.where(
							`(tx.originChain = :${srcName} AND tx.destinationChain = :${dstName})`,
							{
								[srcName]: info.srcChain,
								[dstName]: info.dstChain,
							},
						);
					} else {
						qb.orWhere(
							`(tx.originChain = :${srcName} AND tx.destinationChain = :${dstName})`,
							{
								[srcName]: info.srcChain,
								[dstName]: info.dstChain,
							},
						);
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
			let tokenName: string = '';
			// hack solution for token names, will work for now
			switch (chain as ChainEnum) {
				case ChainEnum.BNB:
					tokenName = TokenEnum.BNAP3X;
					break;
				case ChainEnum.Base:
					tokenName = TokenEnum.BAP3X;
					break;
				case ChainEnum.Cardano:
				case ChainEnum.Prime:
					const tokens =
						this.settingsService.SettingsResponse.settingsPerMode[
							BridgingModeEnum.Skyline
						].cardanoChainsNativeTokens[chain as ChainEnum];
					tokenName =
						!!tokens && tokens.length > 0 ? tokens[0].tokenName.trim() : '';
					break;
			}

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

			if (!!tokenName && nativeSum !== null) {
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
}
