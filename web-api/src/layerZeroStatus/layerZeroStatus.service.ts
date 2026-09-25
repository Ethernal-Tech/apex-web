import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LayerZeroNetworkConfig } from 'src/appConfig/appConfig.interface';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { BridgingRequestNotFinalStatesMap } from 'src/bridgeTransaction/bridgeTransaction.helper';
import {
	BridgingModeEnum,
	ChainEnum,
	TransactionStatusEnum,
} from 'src/common/enum';
import { JobLockService } from 'src/jobLock/jobLock.service';
import { SettingsService } from 'src/settings/settings.service';
import { getCurrencyIDFromDirectionConfig } from 'src/settings/utils';
import { convertWeiToDfmByChain } from 'src/utils/generalUtils';
import { In, Repository } from 'typeorm';
import {
	decodeOftPayload,
	getLayerZeroOAppMessages,
	LayerZeroMessage,
} from './layerZeroScan.helper';
import { LayerZeroSyncState } from './layerZeroSyncState.entity';
import {
	DEFAULT_DECIMAL_CONVERSION_RATE,
	readDecimalConversionRate,
} from './oft.helper';
import { EmptyRpcResultError } from 'src/utils/evmRpc';

const LAYER_ZERO_STATUS_CRON = '0 */5 * * * *';
const LAYER_ZERO_STATUS_JOB_NAME = 'layerZeroStatusJob';

const PAGE_SIZE = 50;
// bounds one tick's work, so the first sweep over the whole listing is spread over several runs
const MAX_PAGES_PER_RUN = 10;

const isFinalStatus = (status: TransactionStatusEnum): boolean =>
	!BridgingRequestNotFinalStatesMap[status];

/** Where a walk over the listing stopped. */
type WalkResult = {
	pagesRead: number;
	/** The page to continue from, undefined once the listing has run out. */
	nextToken?: string;
	/** False when the scan API stopped answering, so the cursor stays put. */
	completed: boolean;
	/**
	 * True when the walk ran out of listing or reached transfers this API already
	 * has, rather than running out of its page budget - nothing is left below.
	 */
	caughtUp: boolean;
};

/**
 * Imports LayerZero transfers that were sent straight to an OFT instead of
 * through this API, so they show up in history and count towards TVB.
 *
 * Every transfer is a message LayerZero has indexed against the OApp it went
 * through, so each configured chain's listing is read rather than its chain: one
 * request brings a page of transfers with their status, timings and amounts,
 * where reading the chain would mean paging an `eth_getLogs` filter over every
 * block since the last run and then asking LayerZero about each hash separately.
 *
 * The listing is newest first. Each run reads it from the top until a page brings
 * nothing new, which is one request once it has caught up, and then carries the
 * backfill of everything below that a page further.
 */
@Injectable()
export class LayerZeroStatusService {
	/** Fixed per deployment, so read once per chain and kept for the process. */
	private readonly rateCache = new Map<string, bigint>();

	constructor(
		@InjectRepository(BridgeTransaction)
		private readonly bridgeTransactionRepository: Repository<BridgeTransaction>,
		@InjectRepository(LayerZeroSyncState)
		private readonly layerZeroSyncStateRepository: Repository<LayerZeroSyncState>,
		private readonly jobLock: JobLockService,
		private readonly appConfig: AppConfigService,
		private readonly settingsService: SettingsService,
	) {}

	// every minute
	@Cron(LAYER_ZERO_STATUS_CRON, { name: LAYER_ZERO_STATUS_JOB_NAME })
	async syncFromLayerZero(): Promise<void> {
		const modesSupported = new Set<string>(
			this.appConfig.features.statusUpdateModesSupported,
		);

		if (!modesSupported.has(BridgingModeEnum.LayerZero)) {
			return;
		}

		const networks = this.appConfig.layerZero.networks;

		if (networks.length === 0) {
			return;
		}

		await this.jobLock.runExclusive(LAYER_ZERO_STATUS_JOB_NAME, async () => {
			// once for the whole tick: a listing carries transfers of every chain it
			// talks to, and looking the rate up per transfer is hundreds of calls
			const rates = await this.readConversionRates(networks);

			for (const network of networks) {
				await this.syncNetwork(network, rates);
			}
		});
	}

	private async syncNetwork(
		network: LayerZeroNetworkConfig,
		rates: Map<string, bigint>,
	): Promise<void> {
		const state = await this.loadState(network);

		// the newest messages, however many runs' worth of them have piled up
		const top = await this.walk(
			network,
			rates,
			undefined,
			MAX_PAGES_PER_RUN,
			true,
		);

		if (top.caughtUp) {
			// either the whole listing fitted in what was just read, or it reached
			// transfers this API already has and everything below them is older. That
			// only settles the backfill while none is pending: once one is, the
			// history below its cursor is unread however far down this walk got
			if (!state.backfillToken) {
				state.backfillDone = true;
			}
		} else if (top.completed) {
			// the walk never reached transfers this API has, so between where it gave
			// up and the end of the listing there are transfers it has not seen - even
			// if a previous run had read to the bottom. Carrying on from here covers
			// any older cursor too, and re-reading stored transfers costs nothing
			state.backfillToken = top.nextToken;
			state.backfillDone = false;
		}

		const budget = MAX_PAGES_PER_RUN - top.pagesRead;

		if (!state.backfillDone && state.backfillToken && budget > 0) {
			const deep = await this.walk(
				network,
				rates,
				state.backfillToken,
				budget,
				false,
			);

			// on a failed page this is the page that failed, so it is read again
			state.backfillToken = deep.nextToken ?? null;
			state.backfillDone = deep.caughtUp;

			if (state.backfillDone) {
				Logger.log(`layer zero backfill for ${network.chain} is complete`);
			}
		}

		await this.saveState(state);
	}

	/**
	 * Reads pages from `startToken` down, importing what this API does not have.
	 *
	 * `stopWhenNothingNew` is how the walk from the top ends: a page where every
	 * transfer is already stored means the ones below it are too. That holds as
	 * long as a page spans far more time than LayerZero takes to index a message,
	 * which a page of fifty does by weeks here.
	 */
	private async walk(
		network: LayerZeroNetworkConfig,
		rates: Map<string, bigint>,
		startToken: string | undefined,
		maxPages: number,
		stopWhenNothingNew: boolean,
	): Promise<WalkResult> {
		let nextToken = startToken;
		let pagesRead = 0;
		let caughtUp = false;

		while (pagesRead < maxPages) {
			const page = await getLayerZeroOAppMessages(
				network.chainID,
				network.oftAddress,
				PAGE_SIZE,
				nextToken,
			);

			// the scan API is unreachable or erroring, leave the cursor on this page
			if (!page) {
				return { pagesRead, nextToken, completed: false, caughtUp: false };
			}

			pagesRead++;

			const imported = await this.importMessages(network, rates, page.messages);

			nextToken = page.nextToken;

			if (!nextToken || (stopWhenNothingNew && imported === 0)) {
				caughtUp = true;

				break;
			}
		}

		return { pagesRead, nextToken, completed: true, caughtUp };
	}

	/** Stores the transfers of a page this API does not have, and counts them. */
	private async importMessages(
		network: LayerZeroNetworkConfig,
		rates: Map<string, bigint>,
		messages: LayerZeroMessage[],
	): Promise<number> {
		const hashes = messages
			.map((message) => message.source.txHash)
			.filter((hash): hash is string => !!hash);

		if (hashes.length === 0) {
			return 0;
		}

		const stored = await this.storedHashes(hashes);
		const entities: BridgeTransaction[] = [];

		for (const message of messages) {
			if (!message.source.txHash || stored.has(message.source.txHash)) {
				continue;
			}

			const entity = this.toBridgeTransaction(rates, message);

			if (entity) {
				entities.push(entity);
			}
		}

		if (entities.length === 0) {
			return 0;
		}

		// a transfer submitted through this API between the lookup above and here
		// would collide on the unique sourceTxHash, orIgnore keeps the rest
		await this.bridgeTransactionRepository
			.createQueryBuilder()
			.insert()
			.into(BridgeTransaction)
			.values(entities)
			.orIgnore()
			.execute();

		Logger.log(
			`imported ${entities.length} layer zero discovered transactions from the ${network.chain} listing`,
		);

		return entities.length;
	}

	/** Of the hashes handed in, the ones this API already has a transaction for. */
	private async storedHashes(hashes: string[]): Promise<Set<string>> {
		// evm hashes are stored 0x prefixed, but look both spellings up the way the
		// status job does before deciding a transfer is new
		const candidates = hashes.flatMap((hash) => [
			hash,
			hash.replace(/^0x/, ''),
		]);

		const existing = await this.bridgeTransactionRepository.find({
			select: { id: true, sourceTxHash: true },
			where: { sourceTxHash: In(candidates) },
		});

		const stored = new Set<string>();

		for (const tx of existing) {
			stored.add(tx.sourceTxHash);
			stored.add(
				tx.sourceTxHash.startsWith('0x')
					? tx.sourceTxHash.slice(2)
					: `0x${tx.sourceTxHash}`,
			);
		}

		return stored;
	}

	private toBridgeTransaction(
		rates: Map<string, bigint>,
		message: LayerZeroMessage,
	): BridgeTransaction | undefined {
		const sourceTxHash = message.source.txHash;
		const originChain = this.chainOfEid(message.pathway.srcEid);
		const destinationChain = this.chainOfEid(message.pathway.dstEid);

		if (!sourceTxHash || !originChain || !destinationChain) {
			Logger.debug(
				`skipping message ${sourceTxHash}, it runs between endpoints ${message.pathway.srcEid} and ${message.pathway.dstEid}, which are not both configured`,
			);

			return;
		}

		const tokenID = this.tokenIDOf(originChain, destinationChain);

		if (tokenID === undefined) {
			Logger.warn(
				`skipping ${sourceTxHash}, no token pair configured for ${originChain} -> ${destinationChain}`,
			);

			return;
		}

		const transfer = decodeOftPayload(message.payload);

		if (!transfer) {
			Logger.warn(
				`skipping ${sourceTxHash}, its message body is not an OFT transfer`,
			);

			return;
		}

		// the amount is in the shared decimals of the message, so it scales by the
		// rate of the OFT it left, which is not the listing this was read on
		const rate = rates.get(originChain) ?? DEFAULT_DECIMAL_CONVERSION_RATE;

		const createdAt = message.source.sentAt ?? new Date();
		const amountWei = String(transfer.amountSD * rate);
		const amount = String(convertWeiToDfmByChain(amountWei, originChain));

		const entity = new BridgeTransaction();

		entity.sourceTxHash = sourceTxHash;
		entity.originChain = originChain;
		entity.destinationChain = destinationChain;
		entity.status = message.status;
		entity.isRefund = false;
		entity.destinationTxHash = message.destination.txHash;
		entity.createdAt = createdAt;
		entity.finishedAt = isFinalStatus(message.status)
			? message.destination.deliveredAt ?? createdAt
			: undefined;
		entity.senderAddress = message.source.from ?? '';
		entity.receiverAddresses = transfer.receiver;
		entity.tokenID = tokenID;

		// the OFT moves one asset: it is the currency of the chain it leaves from,
		// nexus, or a token there, base and bsc. TVB reads the two apart by which
		// column carries the amount
		if (tokenID === 0) {
			entity.amountWei = amountWei;
			entity.amount = amount;
			entity.tokenAmountWei = '0';
			entity.nativeTokenAmount = '0';
		} else {
			// the currency that went with it is the LayerZero messaging fee, which
			// is paid to the protocol rather than bridged
			entity.amountWei = '0';
			entity.amount = '0';
			entity.tokenAmountWei = amountWei;
			entity.nativeTokenAmount = amount;
		}

		entity.txRaw = '';
		entity.isLayerZero = true;
		entity.isOracleDiscovered = true;
		// these rows have no submitting client, activeFrom must stay null or history hides them
		entity.activeFrom = undefined;
		entity.clientID = null;

		return entity;
	}

	/**
	 * The cursor for a chain. Pointing it at another OApp starts the walk over,
	 * the pages read say nothing about a listing that is not the same one.
	 */
	private async loadState(
		network: LayerZeroNetworkConfig,
	): Promise<LayerZeroSyncState> {
		const chain = network.chain as ChainEnum;
		const state = await this.layerZeroSyncStateRepository.findOne({
			where: { chain },
		});

		if (state) {
			if (
				state.oftAddress === network.oftAddress &&
				state.eid === network.chainID
			) {
				return state;
			}

			Logger.warn(
				`layer zero config for ${chain} changed from oapp ${state.oftAddress} on ${state.eid} ` +
					`to ${network.oftAddress} on ${network.chainID}, restarting the walk`,
			);
		}

		return this.layerZeroSyncStateRepository.create({
			chain,
			oftAddress: network.oftAddress,
			eid: network.chainID,
			backfillToken: null,
			backfillDone: false,
		});
	}

	private async saveState(state: LayerZeroSyncState): Promise<void> {
		state.updatedAt = new Date();

		await this.layerZeroSyncStateRepository.save(state);
	}

	/**
	 * The conversion rate of every configured chain, read once and then taken from
	 * the cache for the rest of the process.
	 *
	 * The default stands in whenever the real one cannot be had, so a deployment
	 * whose RPCs and OFTs are on the same network imports at the rate it reads and
	 * one where they are not - a testnet API pointed at mainnet contracts - still
	 * imports at the rate they all use.
	 */
	private async readConversionRates(
		networks: LayerZeroNetworkConfig[],
	): Promise<Map<string, bigint>> {
		const rates = new Map<string, bigint>();

		for (const network of networks) {
			rates.set(network.chain, await this.conversionRateOf(network));
		}

		return rates;
	}

	private async conversionRateOf(
		network: LayerZeroNetworkConfig,
	): Promise<bigint> {
		const cached = this.rateCache.get(network.chain);

		if (cached) {
			return cached;
		}

		const rpcUrl = this.evmRpcUrl(network.chain);

		if (!rpcUrl) {
			// the urls come from the environment, so this will not change under us
			return this.standInRate(
				network.chain,
				`no rpc url is configured for it`,
				true,
			);
		}

		try {
			const rate = await readDecimalConversionRate(rpcUrl, network.oftAddress);

			this.rateCache.set(network.chain, rate);

			return rate;
		} catch (e) {
			// the node answered and there is no such contract on it: asking again
			// cannot help, the address it would have to appear at is configuration
			const permanent = e instanceof EmptyRpcResultError;

			return this.standInRate(
				network.chain,
				`${e}. Is ${rpcUrl} the network ${network.oftAddress} is deployed on?`,
				permanent,
			);
		}
	}

	/**
	 * The default rate, warned about once. A reason that cannot resolve itself is
	 * cached as the answer, so it is neither asked again nor warned about again;
	 * a node that was merely unreachable is asked again next run.
	 */
	private standInRate(
		chain: string,
		reason: string,
		permanent: boolean,
	): bigint {
		if (permanent) {
			this.rateCache.set(chain, DEFAULT_DECIMAL_CONVERSION_RATE);
		}

		Logger.warn(
			`could not read the decimal conversion rate of the oft on ${chain}, ` +
				`taking it as ${DEFAULT_DECIMAL_CONVERSION_RATE}: ${reason}`,
		);

		return DEFAULT_DECIMAL_CONVERSION_RATE;
	}

	/** LayerZero endpoint ids are what `chainID` holds in LAYERZERO_CONFIG. */
	private chainOfEid(eid: number): ChainEnum | undefined {
		return this.appConfig.layerZero.networks.find(
			(network) => network.chainID === eid,
		)?.chain as ChainEnum | undefined;
	}

	/**
	 * The token a transfer in this direction moves, zero when that is the currency
	 * of the origin chain - this column names a token and never the currency,
	 * mirroring transaction.service.
	 */
	private tokenIDOf(
		originChain: ChainEnum,
		destinationChain: ChainEnum,
	): number | undefined {
		const { directionConfig } = this.settingsService.SettingsResponse;
		const pair =
			directionConfig[originChain]?.destChain?.[destinationChain]?.[0];

		if (!pair) {
			return undefined;
		}

		return pair.srcTokenID ===
			getCurrencyIDFromDirectionConfig(directionConfig, originChain)
			? 0
			: pair.srcTokenID;
	}

	private evmRpcUrl(chain: string): string | undefined {
		return this.appConfig.rpc?.evmUrls?.find((entry) => entry.chain === chain)
			?.value;
	}
}
