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
	ChainEnum,
	GroupByTimePeriod,
	TransactionStatusEnum,
} from 'src/common/enum';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SettingsService } from 'src/settings/settings.service';

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
	apiKey = process.env.CARDANO_API_API_KEY;

	async init() {
		this.endpointUrl =
			process.env.CARDANO_API_URL + `/api/CardanoTx/GetLockedTokens`;
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

	public async sumTransferredTokensPerChain(): Promise<LockedTokensResponse> {
		const cacheKey = 'transferredTokensPerChainNestedMap';
		const cached = await this.cacheManager.get<LockedTokensResponse>(cacheKey);

		if (cached !== undefined) {
			return cached;
		}

		const chains = Object.values(ChainEnum);
		const result = new LockedTokensResponse();
		result.chains = {};

		for (const chain of chains) {
			// Always query amountSum
			const { amountSum } = await this.bridgeTransactionRepository
				.createQueryBuilder('tx')
				.select('SUM(tx.amount)', 'amountSum')
				.where('tx.status = :status', {
					status: TransactionStatusEnum.ExecutedOnDestination,
				})
				.andWhere('tx.originChain = :chain', { chain })
				.getRawOne();

			const tokens =
				this.settingsService.SettingsResponse.cardanoChainsNativeTokens[chain];

			const tokenName = tokens && Object.values(tokens)[0]?.tokenName?.trim();

			const chainResult: Record<string, string> = {
				amount: amountSum,
			};

			// ✅ Only query nativeSum if tokenName exists and is non-empty
			if (tokenName) {
				const { nativeSum } = await this.bridgeTransactionRepository
					.createQueryBuilder('tx')
					.select('SUM(tx.nativeTokenAmount)', 'nativeSum')
					.where('tx.status = :status', {
						status: TransactionStatusEnum.ExecutedOnDestination,
					})
					.andWhere('tx.originChain = :chain', { chain })
					.getRawOne();

				chainResult[tokenName] = nativeSum;
			}

			result.chains[chain] = chainResult;
		}

		await this.cacheManager.set(cacheKey, result, 30);

		return result;
	}

	public async sumOfTransferredTokenByDate(
		startDate: Date,
		endDate: Date,
		groupBy: GroupByTimePeriod,
	): Promise<TransferredTokensByDay[]> {
		const dateTruncUnit = groupBy.toLowerCase(); // 'hour', 'day', etc.

		const rawResults = await this.bridgeTransactionRepository
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
			.setParameter('truncUnit', dateTruncUnit)
			.groupBy(`TIMEZONE('UTC', DATE_TRUNC(:truncUnit, tx.finishedAt))`)
			.addGroupBy('tx.originChain')
			.orderBy(`TIMEZONE('UTC', DATE_TRUNC(:truncUnit, tx.finishedAt))`, 'ASC')
			.getRawMany();

		const groupedByDate: Record<string, TransferredTokensByDay> = {};

		for (const row of rawResults) {
			const rawDate = new Date(row.groupedDate);
			let normalizedDate: Date;

			if (groupBy === GroupByTimePeriod.Week) {
				// Normalize to start of ISO week (Monday)
				const day = rawDate.getUTCDay(); // 0 (Sun) to 6 (Sat)
				const diffToMonday = (day + 6) % 7; // days since last Monday
				normalizedDate = new Date(
					Date.UTC(
						rawDate.getUTCFullYear(),
						rawDate.getUTCMonth(),
						rawDate.getUTCDate() - diffToMonday,
					),
				);
			} else {
				// Set time to start of hour/day/month
				normalizedDate = new Date(
					Date.UTC(
						rawDate.getUTCFullYear(),
						groupBy === GroupByTimePeriod.Month
							? rawDate.getUTCMonth()
							: rawDate.getUTCMonth(),
						groupBy === GroupByTimePeriod.Month ? 1 : rawDate.getUTCDate(),
						groupBy === GroupByTimePeriod.Hour ? rawDate.getUTCHours() : 0,
						0,
						0,
						0,
					),
				);
			}

			const dateKey = normalizedDate.toISOString();

			const chain: string = row.chain;
			const amountSum: string = row.amountSum;
			const nativeSum: string = row.nativeSum;

			const tokens =
				this.settingsService.SettingsResponse.cardanoChainsNativeTokens?.[
					chain
				];
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
}
