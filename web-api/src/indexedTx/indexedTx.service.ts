import { Injectable, Logger } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { BridgingModeEnum } from 'src/common/enum';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { IndexerCursor } from './indexerCursor.entity';
import {
	applyIndexedTx,
	fetchIndexedBridgingTxs,
	IndexedBridgingTx,
	IndexedTxEntityFields,
	isPermanentSaveError,
	mapIndexedTxToEntityFields,
} from './indexedTx.helper';

const PULL_LIMIT = 200;
// upper bound of pages pulled in a single run, so catching up does not block the job for too long
const MAX_PAGES_PER_RUN = 10;
// a tx that keeps failing for an unknown reason is skipped after this many attempts,
// so it can not stop recording of all later txs
const MAX_SAVE_ATTEMPTS = 10;

/**
 * Records reactor bridging transactions indexed by cardano-api on the source chains.
 * The cursor is stored per bridging mode, so it does not collide with the skyline
 * instance using the same database.
 */
@Injectable()
export class IndexedTxService {
	// failed save attempts of the tx currently blocking the pull
	private saveFailure: { txHash: string; attempts: number } | undefined;

	constructor(
		@InjectRepository(BridgeTransaction)
		private readonly bridgeTransactionRepository: Repository<BridgeTransaction>,
		@InjectRepository(IndexerCursor)
		private readonly indexerCursorRepository: Repository<IndexerCursor>,
		private readonly schedulerRegistry: SchedulerRegistry,
		private readonly appConfig: AppConfigService,
	) {}

	// every 3 seconds
	@Cron('*/3 * * * * *', { name: 'pullIndexedTxsJob' })
	async pullIndexedTxs(): Promise<void> {
		if (
			!this.appConfig.statusUpdateModesSupported.includes(
				BridgingModeEnum.Reactor,
			)
		) {
			return;
		}

		const job = this.schedulerRegistry.getCronJob('pullIndexedTxsJob');
		job.stop();

		try {
			await this.pull();
		} catch (e) {
			Logger.error(
				`Error while pulling indexed txs: ${e}`,
				(e as Error)?.stack,
			);
		} finally {
			job.start();
		}
	}

	async pull(): Promise<void> {
		for (let page = 0; page < MAX_PAGES_PER_RUN; page++) {
			const cursor = await this.getCursor();
			const response = await fetchIndexedBridgingTxs(
				cursor.lastSeq,
				PULL_LIMIT,
			);
			if (!response) {
				return;
			}

			if (response.cursorAhead) {
				Logger.warn(
					`Indexed txs cursor (${cursor.lastSeq}) is ahead of cardano-api, starting from the beginning`,
				);

				await this.saveCursor(cursor, '0');

				continue;
			}

			if (response.hasGap) {
				Logger.error(
					`Indexed txs after ${cursor.lastSeq} were pruned on cardano-api before being pulled`,
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
	 * Processing stops at the first failure that may succeed later, so the rest is
	 * pulled again next time. Txs that can never be saved are skipped.
	 */
	async saveTxs(txs: IndexedBridgingTx[]): Promise<number | undefined> {
		const existing = await this.bridgeTransactionRepository.find({
			where: { sourceTxHash: In(txs.map((tx) => tx.txHash)) },
		});
		const existingByHash = new Map(existing.map((e) => [e.sourceTxHash, e]));

		let lastSavedSeq: number | undefined;

		for (const tx of txs) {
			let fields: IndexedTxEntityFields | undefined;

			try {
				fields = mapIndexedTxToEntityFields(tx);
			} catch (e) {
				this.logSkippedTx(tx, `invalid tx data: ${e}`);
				lastSavedSeq = tx.seq;

				continue;
			}

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
				this.saveFailure = undefined;
			} catch (e) {
				if (isPermanentSaveError(e) || this.registerSaveFailure(tx)) {
					this.logSkippedTx(tx, `${e}`);
					lastSavedSeq = tx.seq;

					continue;
				}

				// e.g. the same tx was inserted in the meantime, or the database is not reachable
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

	/** Returns true when the tx failed too many times and should be skipped */
	private registerSaveFailure(tx: IndexedBridgingTx): boolean {
		const attempts =
			this.saveFailure?.txHash === tx.txHash
				? this.saveFailure.attempts + 1
				: 1;

		if (attempts >= MAX_SAVE_ATTEMPTS) {
			this.saveFailure = undefined;

			return true;
		}

		this.saveFailure = { txHash: tx.txHash, attempts };

		return false;
	}

	private logSkippedTx(tx: IndexedBridgingTx, reason: string) {
		Logger.error(
			`Skipping indexed tx ${tx.originChainId}:${tx.txHash} (seq ${tx.seq}), it will not be recorded: ${reason}`,
		);
	}

	private async getCursor(): Promise<IndexerCursor> {
		const cursor = await this.indexerCursorRepository.findOne({
			where: { bridgingMode: BridgingModeEnum.Reactor },
		});
		if (cursor) {
			return cursor;
		}

		const newCursor = new IndexerCursor();
		newCursor.bridgingMode = BridgingModeEnum.Reactor;
		newCursor.lastSeq = '0';

		return newCursor;
	}

	private async saveCursor(cursor: IndexerCursor, lastSeq: string) {
		cursor.lastSeq = lastSeq;
		cursor.updatedAt = new Date();

		await this.indexerCursorRepository.save(cursor);
	}
}
