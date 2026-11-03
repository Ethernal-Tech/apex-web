import { Injectable, Logger } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LayerZeroNetworkConfig } from 'src/appConfig/appConfig.interface';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { BridgingModeEnum, ChainEnum } from 'src/common/enum';
import { isPermanentSaveError } from 'src/indexedTx/indexedTx.helper';
import { SettingsService } from 'src/settings/settings.service';
import { getCurrencyIDFromDirectionConfig } from 'src/settings/utils';
import {
	DEFAULT_DECIMAL_CONVERSION_RATE,
	getLayerZeroOAppMessages,
	LayerZeroMessage,
	readDecimalConversionRate,
} from './layerZeroScan.helper';
import {
	LayerZeroMappingContext,
	mapLayerZeroMessage,
} from './layerZeroSync.helper';
import { LayerZeroSyncState } from './layerZeroSyncState.entity';

const JOB_NAME = 'layerZeroSyncJob';
export const LAYER_ZERO_PAGE_SIZE = 50;
// pages read from the top of the listing per run. Once caught up a run reads one
export const LAYER_ZERO_NEW_PAGES_PER_RUN = 5;
// pages of older history read per run, kept low so the backfill does not load the scan API
export const LAYER_ZERO_BACKFILL_PAGES_PER_RUN = 2;

/** Where a walk over the listing stopped */
type WalkResult = {
	pagesRead: number;
	/** the page to continue from, undefined once the listing has run out */
	nextToken?: string;
	/** false when the scan API stopped answering, the cursor stays where it was */
	completed: boolean;
	/** true when the walk reached the end of the listing or transfers already stored */
	caughtUp: boolean;
};

/**
 * Records LayerZero transfers of the configured OFTs, observed by LayerZero scan.
 *
 * Every transfer is a message LayerZero indexes against the OApp (our OFT) it
 * went through. Each run reads the listing of every configured chain from the
 * top (newest first) until a page brings nothing new, so new transfers are
 * recorded within one run of being indexed, and once caught up a run costs one
 * request per chain. Older history is read separately, a few pages per run.
 *
 * Statuses of recorded transfers are then updated by the status update job.
 */
@Injectable()
export class LayerZeroSyncService {
	/** decimal conversion rates of OFTs, fixed per deployment */
	private readonly rates = new Map<ChainEnum, bigint>();

	constructor(
		@InjectRepository(BridgeTransaction)
		private readonly bridgeTransactionRepository: Repository<BridgeTransaction>,
		@InjectRepository(LayerZeroSyncState)
		private readonly syncStateRepository: Repository<LayerZeroSyncState>,
		private readonly settingsService: SettingsService,
		private readonly schedulerRegistry: SchedulerRegistry,
		private readonly appConfig: AppConfigService,
	) {}

	// every 15 seconds
	@Cron('*/15 * * * * *', { name: JOB_NAME })
	async syncLayerZero(): Promise<void> {
		const networks = this.appConfig.layerZero.networks ?? [];

		if (
			// LayerZero has no testnet, a testnet instance must never record mainnet transfers
			!this.appConfig.app.isMainnet ||
			networks.length === 0 ||
			!this.settingsService.SettingsResponse ||
			!this.appConfig.features.statusUpdateModesSupported.includes(
				BridgingModeEnum.LayerZero,
			)
		) {
			return;
		}

		const job = this.schedulerRegistry.getCronJob(JOB_NAME);
		job.stop();

		try {
			for (const network of networks) {
				try {
					await this.syncNetwork(network);
				} catch (e) {
					Logger.error(
						`Error while syncing layer zero transfers of ${network.chain}: ${e}`,
						(e as Error)?.stack,
					);
				}
			}
		} finally {
			job.start();
		}
	}

	async syncNetwork(network: LayerZeroNetworkConfig): Promise<void> {
		await this.loadConversionRate(network);

		const state = await this.loadState(network);

		// new transfers, however many runs' worth of them piled up
		const top = await this.walk(
			network,
			undefined,
			LAYER_ZERO_NEW_PAGES_PER_RUN,
			true,
		);

		if (top.caughtUp) {
			// everything below the top is already stored, unless an older backfill is
			// still pending (then the history below its cursor is still unread)
			if (!state.backfillToken) {
				state.backfillDone = true;
			}
		} else if (top.completed) {
			// the walk ran out of pages before reaching stored transfers, so the part
			// of the listing below it has not been read. Continue the backfill there,
			// it covers any older cursor too (stored transfers are skipped)
			state.backfillToken = top.nextToken ?? null;
			state.backfillDone = !top.nextToken;
		}

		if (!state.backfillDone && state.backfillToken) {
			const backfill = await this.walk(
				network,
				state.backfillToken,
				LAYER_ZERO_BACKFILL_PAGES_PER_RUN,
				false,
			);

			// on a failed page this is the page that failed, so it is read again
			state.backfillToken = backfill.nextToken ?? null;
			state.backfillDone = backfill.completed && !backfill.nextToken;

			if (state.backfillDone) {
				Logger.log(`layer zero backfill for ${network.chain} is complete`);
			}
		}

		state.updatedAt = new Date();
		await this.syncStateRepository.save(state);
	}

	/**
	 * Reads pages from startToken down and records transfers not stored yet.
	 * With stopWhenNothingNew the walk ends at the first page without new
	 * transfers, since everything below it is older and already stored.
	 */
	private async walk(
		network: LayerZeroNetworkConfig,
		startToken: string | undefined,
		maxPages: number,
		stopWhenNothingNew: boolean,
	): Promise<WalkResult> {
		let nextToken = startToken;
		let pagesRead = 0;

		while (pagesRead < maxPages) {
			const page = await getLayerZeroOAppMessages(
				network.chainID,
				network.oftAddress,
				LAYER_ZERO_PAGE_SIZE,
				nextToken,
			);
			if (!page) {
				return { pagesRead, nextToken, completed: false, caughtUp: false };
			}

			pagesRead++;

			const recorded = await this.recordMessages(network, page.messages);

			nextToken = page.nextToken;

			if (!nextToken || (stopWhenNothingNew && recorded === 0)) {
				return { pagesRead, nextToken, completed: true, caughtUp: true };
			}
		}

		return { pagesRead, nextToken, completed: true, caughtUp: false };
	}

	/** Stores transfers of a page that are not stored yet and returns their count */
	async recordMessages(
		network: LayerZeroNetworkConfig,
		messages: LayerZeroMessage[],
	): Promise<number> {
		const hashes = messages
			.map((message) => message.source.txHash?.toLowerCase())
			.filter((hash): hash is string => !!hash);
		if (hashes.length === 0) {
			return 0;
		}

		const existing = await this.bridgeTransactionRepository.find({
			select: { id: true, sourceTxHash: true },
			where: { sourceTxHash: In(hashes) },
		});
		const stored = new Set(existing.map((tx) => tx.sourceTxHash));
		const ctx = this.mappingContext();

		let recorded = 0;

		for (const message of messages) {
			const hash = message.source.txHash?.toLowerCase();
			if (!hash || stored.has(hash)) {
				continue;
			}

			const result = mapLayerZeroMessage(message, ctx);
			if ('skipReason' in result) {
				Logger.debug(
					`Skipping layer zero message ${hash} from the ${network.chain} listing: ${result.skipReason}`,
				);

				continue;
			}

			try {
				// ignores a transfer inserted in the meantime (unique sourceTxHash)
				const insertResult = await this.bridgeTransactionRepository
					.createQueryBuilder()
					.insert()
					.into(BridgeTransaction)
					.values(result.entity)
					.orIgnore()
					.execute();

				// postgres returns no row for an ignored insert
				if (((insertResult.raw as unknown[] | undefined)?.length ?? 0) > 0) {
					recorded++;
				}

				stored.add(hash);
			} catch (e) {
				if (!isPermanentSaveError(e)) {
					// the cursor is not saved, the page is read again next run
					throw e;
				}

				Logger.error(
					`Skipping layer zero message ${hash}, it can not be stored: ${e}`,
				);
			}
		}

		if (recorded > 0) {
			Logger.log(
				`Recorded ${recorded} layer zero transfers from the ${network.chain} listing`,
			);
		}

		return recorded;
	}

	private mappingContext(): LayerZeroMappingContext {
		const networks = this.appConfig.layerZero.networks ?? [];
		const { directionConfig } = this.settingsService.SettingsResponse;

		return {
			chainOfEid: (eid) =>
				networks.find((network) => network.chainID === eid)?.chain as
					| ChainEnum
					| undefined,
			tokenIDOf: (originChain, destinationChain) => {
				const pair =
					directionConfig[originChain]?.destChain?.[destinationChain]?.[0];
				if (!pair) {
					return undefined;
				}

				const currencyID = getCurrencyIDFromDirectionConfig(
					directionConfig,
					originChain,
				);

				return pair.srcTokenID === currencyID ? 0 : pair.srcTokenID;
			},
			conversionRateOf: (chain) => this.rates.get(chain),
		};
	}

	/** A changed OFT or endpoint id starts the listing over */
	private async loadState(
		network: LayerZeroNetworkConfig,
	): Promise<LayerZeroSyncState> {
		const state = await this.syncStateRepository.findOne({
			where: { chain: network.chain },
		});

		if (
			state &&
			state.oftAddress === network.oftAddress &&
			state.eid === network.chainID
		) {
			return state;
		}

		if (state) {
			Logger.warn(
				`layer zero config for ${network.chain} changed, reading its listing from the start`,
			);
		}

		return this.syncStateRepository.create({
			chain: network.chain,
			oftAddress: network.oftAddress,
			eid: network.chainID,
			backfillToken: null,
			backfillDone: false,
		});
	}

	/**
	 * Reads the OFT's decimal conversion rate once. Until it can be read, the rate
	 * every OFT of this bridge uses is assumed.
	 */
	private async loadConversionRate(network: LayerZeroNetworkConfig) {
		const chain = network.chain as ChainEnum;
		if (this.rates.has(chain)) {
			return;
		}

		const rpcUrl = this.appConfig.rpc?.evmUrls?.find(
			(entry) => entry.chain === chain,
		)?.value;

		if (!rpcUrl) {
			Logger.warn(
				`no rpc url for ${chain}, assuming oft decimal conversion rate ${DEFAULT_DECIMAL_CONVERSION_RATE}`,
			);
			this.rates.set(chain, DEFAULT_DECIMAL_CONVERSION_RATE);

			return;
		}

		try {
			this.rates.set(
				chain,
				await readDecimalConversionRate(rpcUrl, network.oftAddress),
			);
		} catch (e) {
			// not cached, so it is read again next run
			Logger.warn(
				`could not read oft decimal conversion rate on ${chain}, assuming ${DEFAULT_DECIMAL_CONVERSION_RATE}: ${e}`,
			);
		}
	}
}
