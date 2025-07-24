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
import { ChainEnum, TransactionStatusEnum } from 'src/common/enum';
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
	): Promise<TransferredTokensByDay[]> {
		const rawResults = await this.bridgeTransactionRepository
			.createQueryBuilder('tx')
			.select("TIMEZONE('UTC', DATE_TRUNC('day', tx.finishedAt))", 'day')
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
			.groupBy('day, chain')
			.orderBy('day', 'ASC')
			.getRawMany();

		const groupedByDate: Record<string, TransferredTokensByDay> = {};

		for (const row of rawResults) {
			const rawDate = new Date(row.day);
			const utcDate = new Date(
				Date.UTC(
					rawDate.getUTCFullYear(),
					rawDate.getUTCMonth(),
					rawDate.getUTCDate(),
				),
			);
			const dateKey = utcDate.toISOString().split('T')[0]; // "YYYY-MM-DD"

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
					date: utcDate,
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
