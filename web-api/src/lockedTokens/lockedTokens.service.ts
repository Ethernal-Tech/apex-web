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
	getTokenNameById,
} from 'src/settings/utils';
import { amountToBigInt, convertWeiToDfm } from 'src/utils/generalUtils';
import { getBridgingMode } from 'src/utils/chainUtils';
import { Cron } from '@nestjs/schedule';
import Web3 from 'web3';
import {
	ChainTokenAmounts,
	HistoricalSnapshot,
} from './historicalSnapshot.entity';
import { adaID, apexID, isAdaToken, isApexToken } from './token';

const NEXUS_RPC_URLS = {
	mainnet: 'https://rpc.nexus.mainnet.apexfusion.org/',
	testnet: 'https://rpc.nexus.testnet.apexfusion.org',
} as const;

@Injectable()
export class LockedTokensService {
	constructor(
		@InjectRepository(BridgeTransaction)
		private readonly bridgeTransactionRepository: Repository<BridgeTransaction>,
		@InjectRepository(HistoricalSnapshot)
		private readonly historicalSnapshotRepository: Repository<HistoricalSnapshot>,
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

	/** UTC midnight daily snapshot of TVL / TVB. */
	@Cron('0 0 * * *', {
		name: 'historicalDailySnapshot',
		timeZone: 'UTC',
	})
	async takeDailySnapshot(): Promise<HistoricalSnapshot | null> {
		try {
			const snapshot = await this.buildAndSaveSnapshot(this.utcMidnight());
			Logger.log(
				`historicalDailySnapshot saved for ${snapshot.snapshotAt.toISOString()}`,
			);
			return snapshot;
		} catch (error) {
			Logger.error(
				`historicalDailySnapshot failed: ${
					error instanceof Error ? error.message : String(error)
				}`,
				error instanceof Error ? error.stack : undefined,
			);
			return null;
		}
	}

	public async buildAndSaveSnapshot(
		snapshotAt: Date = this.utcMidnight(),
	): Promise<HistoricalSnapshot> {
		const existing = await this.historicalSnapshotRepository.findOne({
			where: { snapshotAt },
		});

		if (existing) {
			Logger.log(
				`buildAndSaveSnapshot: snapshot already exists for ${snapshotAt.toISOString()}, skipping`,
			);
			return existing;
		}

		const data = await this.fillTokensData([
			BridgingModeEnum.Skyline,
			BridgingModeEnum.LayerZero,
		]);

		const tvlByChain = this.sumLockedByChain(data.chains);
		const tvbByChain = data.totalTransferred;
		const tvlLayerZeroApex = await this.fetchLayerZeroLockedApexDfm();

		const tvlApex = (
			this.tokenAmount(tvlByChain, ChainEnum.Prime, apexID) +
			this.tokenAmount(tvlByChain, ChainEnum.Vector, apexID) +
			BigInt(tvlLayerZeroApex)
		).toString();

		const cardanoCurrencyId =
			getCurrencyIDFromDirectionConfig(
				this.settingsService.SettingsResponse.directionConfig,
				ChainEnum.Cardano,
			) ?? adaID;

		const tvlAda = this.tokenAmount(
			tvlByChain,
			ChainEnum.Cardano,
			cardanoCurrencyId,
		).toString();

		const { tvbApex, tvbAda } = this.sumTransferredTotals(tvbByChain);

		const entity = new HistoricalSnapshot();
		entity.snapshotAt = snapshotAt;
		entity.tvlByChain = tvlByChain;
		entity.tvlLayerZeroApex = tvlLayerZeroApex;
		entity.tvbByChain = tvbByChain;
		entity.tvlApex = tvlApex;
		entity.tvlAda = tvlAda;
		entity.tvbApex = tvbApex;
		entity.tvbAda = tvbAda;

		return this.historicalSnapshotRepository.save(entity);
	}

	private utcMidnight(date = new Date()): Date {
		return new Date(
			Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
		);
	}

	private sumLockedByChain(
		chains: LockedTokensResponse['chains'],
	): ChainTokenAmounts {
		const result: ChainTokenAmounts = {};

		for (const [chain, tokenMap] of Object.entries(chains || {})) {
			result[chain] = {};
			for (const [tokenId, addrMap] of Object.entries(tokenMap || {})) {
				let sum = BigInt(0);
				for (const [address, amount] of Object.entries(addrMap || {})) {
					try {
						sum += BigInt(amount || '0');
					} catch {
						Logger.warn(
							`sumLockedByChain: invalid amount "${amount}" for ${chain}/${tokenId}/${address}`,
						);
					}
				}
				result[chain][tokenId] = sum.toString();
			}
		}

		return result;
	}

	private tokenAmount(
		byChain: ChainTokenAmounts,
		chain: string,
		tokenId: number,
	): bigint {
		const raw = byChain[chain]?.[String(tokenId)] ?? '0';
		try {
			return BigInt(raw);
		} catch {
			return BigInt(0);
		}
	}

	private sumTransferredTotals(tvbByChain: ChainTokenAmounts): {
		tvbApex: string;
		tvbAda: string;
	} {
		let tvbApex = BigInt(0);
		let tvbAda = BigInt(0);

		for (const tokenMap of Object.values(tvbByChain || {})) {
			for (const [tokenKey, amount] of Object.entries(tokenMap || {})) {
				let value = BigInt(0);
				try {
					value = BigInt(amount || '0');
				} catch {
					continue;
				}

				const tokenId = Number(tokenKey);
				if (isApexToken(tokenId)) {
					tvbApex += value;
				} else if (isAdaToken(tokenId)) {
					tvbAda += value;
				}
			}
		}

		return {
			tvbApex: tvbApex.toString(),
			tvbAda: tvbAda.toString(),
		};
	}

	private async fetchLayerZeroLockedApexDfm(): Promise<string> {
		const nexus = this.settingsService.SettingsResponse.layerZeroChains?.find(
			(c) => c.chain === ChainEnum.Nexus,
		);

		if (!nexus?.oftAddress) {
			Logger.warn(
				'fetchLayerZeroLockedApexDfm: Nexus OFT address not configured',
			);
			return '0';
		}

		const rpcUrl = this.appConfig.app.isMainnet
			? NEXUS_RPC_URLS.mainnet
			: NEXUS_RPC_URLS.testnet;

		try {
			const web3 = new Web3(rpcUrl);
			const balanceWei = await web3.eth.getBalance(nexus.oftAddress);
			return convertWeiToDfm(String(balanceWei ?? '0')).split('.')[0];
		} catch (error) {
			Logger.error(
				`fetchLayerZeroLockedApexDfm failed: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
			return '0';
		}
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
			for (const dstChain of Object.keys(config.destChain || {})) {
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

	public async sumOfTransferredTokenByDate(
		startDate: Date,
		endDate: Date,
		groupBy: GroupByTimePeriod,
		allowedBridgingModes: BridgingModeEnum[],
	): Promise<TransferredTokensByDay[]> {
		const fetchResult: any[] = [];
		const settings = this.settingsService.SettingsResponse; // Cache reference for readability

		for (const [srcChain, config] of Object.entries(settings.directionConfig)) {
			for (const dstChain of Object.keys(config.destChain || {})) {
				const allTokenIds = getDirectionTokenIDsFromDirectionConfig(
					settings.directionConfig,
					srcChain,
					dstChain,
				);

				const currencyId = getCurrencyIDFromDirectionConfig(
					settings.directionConfig,
					srcChain,
				);

				const currencyIndex = allTokenIds.indexOf(currencyId!);
				const hasCurrency = currencyIndex !== -1;

				const standardTokenIds = hasCurrency
					? allTokenIds.filter((id) => id !== currencyId)
					: allTokenIds;

				for (const tokenID of standardTokenIds) {
					const rows = await this.processTokenData(
						{ startDate, endDate, groupBy, allowedBridgingModes },
						{ src: srcChain as ChainEnum, dst: dstChain as ChainEnum },
						{ tokenID: tokenID, dbID: tokenID, isNative: true },
					);
					fetchResult.push(...rows);

					const wrappedId = getWrappedCurrencyIDFromDirectionConfig(
						settings.directionConfig,
						srcChain,
					);

					if (wrappedId === tokenID) {
						const compatRows = await this.processTokenData(
							{ startDate, endDate, groupBy, allowedBridgingModes },
							{ src: srcChain as ChainEnum, dst: dstChain as ChainEnum },
							{ tokenID: tokenID, dbID: 0, isNative: true }, // query DB with 0, but report as tokenID
						);
						fetchResult.push(...compatRows);
					}
				}

				if (hasCurrency) {
					const currencyRows = await this.processTokenData(
						{ startDate, endDate, groupBy, allowedBridgingModes },
						{ src: srcChain as ChainEnum, dst: dstChain as ChainEnum },
						{ tokenID: currencyId!, dbID: 0, isNative: false }, // Query DB with 0, report as currencyId
					);
					fetchResult.push(...currencyRows);
				}
			}
		}

		return this.transformRawResultsToDto(fetchResult, groupBy);
	}

	private async processTokenData(
		params: {
			startDate: Date;
			endDate: Date;
			groupBy: GroupByTimePeriod;
			allowedBridgingModes: BridgingModeEnum[];
		},
		chain: { src: ChainEnum; dst: ChainEnum },
		token: { tokenID: number; dbID: number; isNative: boolean },
	) {
		const bridgingMode = getBridgingMode(
			chain.src,
			chain.dst,
			token.tokenID,
			this.settingsService.SettingsResponse,
		);

		if (!bridgingMode || !params.allowedBridgingModes.includes(bridgingMode)) {
			return [];
		}

		const rows = await this.getGroupByAggregatedSum(
			params.startDate,
			params.endDate,
			chain.src,
			chain.dst,
			params.groupBy,
			token.dbID,
			token.isNative,
		);

		if (token.dbID !== token.tokenID) {
			for (const row of rows) {
				row.tokenID = token.tokenID;
			}
		}

		return rows;
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

			if (!groupedByDate[dateKey]) {
				groupedByDate[dateKey] = {
					date: normalizedDate,
					totalTransferred: {},
				};
			}

			const chainResult = this.processRowData(row);

			this.mergeChainResult(
				groupedByDate[dateKey].totalTransferred,
				row.originChain,
				chainResult,
			);
		}

		return Object.values(groupedByDate).sort(
			(a, b) => a.date.getTime() - b.date.getTime(),
		);
	}

	private processRowData(row: any): Record<string, string> {
		const chainResult: Record<string, string> = {};
		const chain = row.originChain;

		const tokenName = getTokenNameById(
			this.settingsService.SettingsResponse.ecosystemTokens,
			row.tokenID,
		);

		if (!tokenName) return chainResult;

		if (row.nativeSum && Number(row.nativeSum) > 0) {
			chainResult[tokenName] = amountToBigInt(row.nativeSum, chain).toString(
				10,
			);

			const currencyTokenId = getCurrencyIDFromDirectionConfig(
				this.settingsService.SettingsResponse.directionConfig,
				chain,
			);

			const currencyName = getTokenNameById(
				this.settingsService.SettingsResponse.ecosystemTokens,
				currencyTokenId!,
			);

			if (currencyName) {
				chainResult[currencyName] = amountToBigInt(row.amount, chain).toString(
					10,
				);
			}
		} else {
			chainResult[tokenName] = amountToBigInt(row.amount, chain).toString(10);
		}

		return chainResult;
	}

	private mergeChainResult(
		totalTransferred: Record<string, Record<string, string>>,
		chain: string,
		newResult: Record<string, string>,
	): void {
		if (!totalTransferred[chain]) {
			totalTransferred[chain] = newResult;
			return;
		}

		const existingData = totalTransferred[chain];

		for (const [key, value] of Object.entries(newResult)) {
			if (existingData[key]) {
				const sum = BigInt(existingData[key]) + BigInt(value);
				existingData[key] = sum.toString(10);
			} else {
				existingData[key] = value;
			}
		}
	}

	private async getGroupByAggregatedSum(
		startDate: Date,
		endDate: Date,
		srcChain: ChainEnum,
		dstChain: ChainEnum,
		groupBy: GroupByTimePeriod,
		tokenID: number = 0,
		isNativeToken: boolean = false,
		status: TransactionStatusEnum = TransactionStatusEnum.ExecutedOnDestination,
	): Promise<
		Array<{
			groupedDate: string;
			amount: string | null;
			nativeSum: string | null;
			originChain: ChainEnum;
			destinationChain: ChainEnum;
			tokenID: number;
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
			.addSelect('tx.tokenID', 'tokenID')
			.where('tx.status = :status', { status })
			.andWhere('tx."finishedAt" >= :start AND tx."finishedAt" < :end', {
				start: startDate,
				end: endDate,
			})
			.andWhere(
				'tx.originChain = :srcChain AND tx.destinationChain = :dstChain',
				{ srcChain, dstChain },
			)
			.andWhere('tx.tokenID = :tokenID', { tokenID });

		if (isNativeToken) {
			qb.andWhere('tx.nativeTokenAmount > 0');
		} else {
			qb.andWhere('tx.nativeTokenAmount = 0');
		}

		qb.setParameter('truncUnit', groupBy.toLowerCase())
			.groupBy(dateExpr)
			.addGroupBy('tx.originChain')
			.addGroupBy('tx.destinationChain')
			.addGroupBy('tx.tokenID')
			.orderBy('"groupedDate"', 'ASC');

		return qb.getRawMany();
	}
}
