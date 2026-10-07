import { Injectable, Logger } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { BridgingModeEnum } from 'src/common/enum';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { SettingsService } from 'src/settings/settings.service';
import { IndexerCursor } from './indexerCursor.entity';
import {
	applyIndexedTx,
	fetchIndexedBridgingTxs,
	IndexedBridgingTx,
	mapIndexedTxToEntityFields,
} from './indexedTx.helper';

const PULL_LIMIT = 200;
// upper bound of pages pulled in a single run, so catching up does not block the job for too long
const MAX_PAGES_PER_RUN = 10;

@Injectable()
export class IndexedTxService {
	constructor(
		@InjectRepository(BridgeTransaction)
		private readonly bridgeTransactionRepository: Repository<BridgeTransaction>,
		@InjectRepository(IndexerCursor)
		private readonly indexerCursorRepository: Repository<IndexerCursor>,
		private readonly settingsService: SettingsService,
		private readonly schedulerRegistry: SchedulerRegistry,
		private readonly appConfig: AppConfigService,
	) {}

	// every 3 seconds
	@Cron('*/3 * * * * *', { name: 'pullIndexedTxsJob' })
	async pullIndexedTxs(): Promise<void> {
		const modes = this.appConfig.features.statusUpdateModesSupported.filter(
			(mode) =>
				mode === BridgingModeEnum.Reactor || mode === BridgingModeEnum.Skyline,
		) as BridgingModeEnum[];

		if (modes.length === 0 || !this.settingsService.SettingsResponse) {
			return;
		}

		const job = this.schedulerRegistry.getCronJob('pullIndexedTxsJob');
		job.stop();

		try {
			for (const mode of modes) {
				try {
					await this.pullMode(mode);
				} catch (e) {
					Logger.error(
						`Error while pulling indexed txs (${mode}): ${e}`,
						(e as Error)?.stack,
					);
				}
			}
		} finally {
			job.start();
		}
	}

	async pullMode(mode: BridgingModeEnum): Promise<void> {
		for (let page = 0; page < MAX_PAGES_PER_RUN; page++) {
			const cursor = await this.getCursor(mode);
			const response = await fetchIndexedBridgingTxs(
				mode,
				cursor.lastSeq,
				PULL_LIMIT,
			);
			if (!response) {
				return;
			}

			if (response.cursorAhead) {
				Logger.warn(
					`Indexed txs cursor for ${mode} (${cursor.lastSeq}) is ahead of cardano-api, starting from the beginning`,
				);

				await this.saveCursor(cursor, '0');

				continue;
			}

			if (response.hasGap) {
				Logger.error(
					`Indexed txs after ${cursor.lastSeq} for ${mode} were pruned on cardano-api before being pulled`,
				);
			}

			const txs = response.txs ?? [];
			if (txs.length === 0) {
				return;
			}

			const lastSavedSeq = await this.saveTxs(txs);
			if (lastSavedSeq !== undefined) {
				await this.saveCursor(cursor, String(lastSavedSeq));
			}

			if (lastSavedSeq !== txs[txs.length - 1].seq || txs.length < PULL_LIMIT) {
				return;
			}
		}
	}

	/**
	 * Saves txs in order and returns the sequence number of the last processed one.
	 * Processing stops at the first failure, so the rest is pulled again next time.
	 */
	private async saveTxs(txs: IndexedBridgingTx[]): Promise<number | undefined> {
		const directionConfig =
			this.settingsService.SettingsResponse.directionConfig;
		const existing = await this.bridgeTransactionRepository.find({
			where: { sourceTxHash: In(txs.map((tx) => tx.txHash)) },
		});
		const existingByHash = new Map(existing.map((e) => [e.sourceTxHash, e]));

		let lastSavedSeq: number | undefined;

		for (const tx of txs) {
			const fields = mapIndexedTxToEntityFields(tx, directionConfig);
			if (!fields) {
				Logger.warn(
					`Skipping indexed tx ${tx.txHash}: unknown chain ${tx.originChainId} -> ${tx.destinationChainId}`,
				);
				lastSavedSeq = tx.seq;

				continue;
			}

			const entity = applyIndexedTx(
				existingByHash.get(tx.txHash),
				tx,
				fields,
				new Date(),
			);

			try {
				const saved = await this.bridgeTransactionRepository.save(entity);
				existingByHash.set(saved.sourceTxHash, saved);
			} catch (e) {
				// e.g. the same tx was inserted in the meantime through the submit endpoint
				Logger.warn(`Failed to save indexed tx ${tx.txHash}: ${e}`);

				break;
			}

			Logger.debug(
				`Indexed tx ${tx.originChainId}:${tx.txHash} saved (seq ${tx.seq})`,
			);

			lastSavedSeq = tx.seq;
		}

		return lastSavedSeq;
	}

	private async getCursor(mode: BridgingModeEnum): Promise<IndexerCursor> {
		const cursor = await this.indexerCursorRepository.findOne({
			where: { bridgingMode: mode },
		});
		if (cursor) {
			return cursor;
		}

		const newCursor = new IndexerCursor();
		newCursor.bridgingMode = mode;
		newCursor.lastSeq = '0';

		return newCursor;
	}

	private async saveCursor(cursor: IndexerCursor, lastSeq: string) {
		cursor.lastSeq = lastSeq;
		cursor.updatedAt = new Date();

		await this.indexerCursorRepository.save(cursor);
	}
}
