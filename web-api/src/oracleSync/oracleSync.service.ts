import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
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
import { isEvmChain } from 'src/utils/chainUtils';
import {
	convertDfmToWei,
	convertWeiToDfmByChain,
} from 'src/utils/generalUtils';
import { In, Repository } from 'typeorm';
import {
	getBridgingRequestStatePage,
	OracleBridgingRequestState,
} from './oracleSync.helper';
import { OracleSyncState } from './oracleSyncState.entity';

const ORACLE_SYNC_CRON = '0 */5 * * * *';
const ORACLE_SYNC_JOB_NAME = 'oracleSyncJob';

const PAGE_SIZE = 500;
// bounds one tick's work, so the first sweep over the whole backlog is spread over several runs
const MAX_PAGES_PER_RUN = 20;

/** The modes whose bridging request states live in an oracle we can page through. */
const SYNCABLE_MODES = [BridgingModeEnum.Reactor, BridgingModeEnum.Skyline];

const isFinalStatus = (status: TransactionStatusEnum): boolean =>
	!BridgingRequestNotFinalStatesMap[status];

/** A stored transaction the oracle still has in flight, paired with the state to put it back to. */
type RegressedState = {
	entity: BridgeTransaction;
	item: OracleBridgingRequestState;
};

/**
 * Imports bridging requests that were sent straight to a bridging address instead of through this
 * API, so they show up in history and count towards TVB.
 *
 * The oracle hands out states in the order it observed them, each with a monotonic syncIndex. We
 * store the index we got to per bridging mode and resume from it, so a sweep costs one page per
 * tick once it has caught up.
 */
@Injectable()
export class OracleSyncService {
	constructor(
		@InjectRepository(BridgeTransaction)
		private readonly bridgeTransactionRepository: Repository<BridgeTransaction>,
		@InjectRepository(OracleSyncState)
		private readonly oracleSyncStateRepository: Repository<OracleSyncState>,
		private readonly jobLock: JobLockService,
		private readonly appConfig: AppConfigService,
		private readonly settingsService: SettingsService,
	) {}

	// every 5 minutes
	@Cron(ORACLE_SYNC_CRON, { name: ORACLE_SYNC_JOB_NAME })
	async syncFromOracle(): Promise<void> {
		const modesSupported = new Set<string>(
			this.appConfig.features.statusUpdateModesSupported,
		);
		const modes = SYNCABLE_MODES.filter((mode) => modesSupported.has(mode));

		if (modes.length === 0) {
			return;
		}

		await this.jobLock.runExclusive(ORACLE_SYNC_JOB_NAME, async () => {
			for (const mode of modes) {
				await this.syncMode(mode);
			}
		});
	}

	private async syncMode(bridgingMode: BridgingModeEnum): Promise<void> {
		let state = await this.oracleSyncStateRepository.findOne({
			where: { bridgingMode },
		});

		if (!state) {
			state = this.oracleSyncStateRepository.create({
				bridgingMode,
				syncIndex: '0',
			});
		}

		for (let page = 0; page < MAX_PAGES_PER_RUN; page++) {
			const response = await getBridgingRequestStatePage(
				bridgingMode,
				state.syncIndex,
				PAGE_SIZE,
			);

			// the oracle is unreachable or erroring, keep the cursor and retry next tick
			if (!response) {
				return;
			}

			// the oracle database was recreated, our index points into a sequence that no longer
			// exists, so walk it again from the start. Already imported txs are skipped by hash.
			if (state.instanceId && state.instanceId !== response.instanceId) {
				Logger.warn(
					`oracle instance changed for ${bridgingMode}, restarting the sweep from zero`,
				);

				state.syncIndex = '0';
				state.instanceId = response.instanceId;
				await this.saveState(state);

				continue;
			}

			await this.importStates(bridgingMode, response.items);

			state.syncIndex = String(response.nextFrom);
			state.instanceId = response.instanceId;
			await this.saveState(state);

			if (!response.hasMore) {
				return;
			}
		}
	}

	private async saveState(state: OracleSyncState): Promise<void> {
		state.updatedAt = new Date();

		await this.oracleSyncStateRepository.save(state);
	}

	private async importStates(
		bridgingMode: BridgingModeEnum,
		items: OracleBridgingRequestState[],
	): Promise<void> {
		const supported = items.filter((item) => this.isSupported(item));

		if (supported.length === 0) {
			return;
		}

		// the oracle spells evm hashes without the 0x this API stores them with, so look both up
		const candidateHashes = supported.flatMap((item) => [
			item.sourceTxHash,
			this.sourceTxHash(item),
		]);

		const existing = await this.bridgeTransactionRepository.find({
			select: { id: true, sourceTxHash: true, status: true },
			where: { sourceTxHash: In(candidateHashes) },
		});
		const existingByHash = new Map(existing.map((tx) => [tx.sourceTxHash, tx]));

		const entities: BridgeTransaction[] = [];
		const regressed: RegressedState[] = [];

		for (const item of supported) {
			const stored =
				existingByHash.get(item.sourceTxHash) ??
				existingByHash.get(this.sourceTxHash(item));

			if (!stored) {
				entities.push(this.toBridgeTransaction(bridgingMode, item));

				continue;
			}

			if (isFinalStatus(stored.status) && !isFinalStatus(item.status)) {
				regressed.push({ entity: stored, item });
			}
		}

		await this.rollBackFinalizedStates(regressed);

		if (entities.length === 0) {
			return;
		}

		// a tx submitted through this API between the find above and here would collide on the
		// unique sourceTxHash, orIgnore keeps the rest of the page
		await this.bridgeTransactionRepository
			.createQueryBuilder()
			.insert()
			.into(BridgeTransaction)
			.values(entities)
			.orIgnore()
			.execute();

		Logger.log(
			`imported ${entities.length} oracle discovered transactions for ${bridgingMode}`,
		);
	}

	/**
	 * Puts a transaction this API already finalised back to the state the oracle reports, whenever
	 * the oracle still has it in flight. The status job finalises a request as soon as one lookup
	 * says so and then stops asking about it, so without this a row that the oracle later moved on
	 * from, a retry or a refund, would keep showing the state it was frozen at.
	 */
	private async rollBackFinalizedStates(
		regressed: RegressedState[],
	): Promise<void> {
		for (const { entity, item } of regressed) {
			// save() skips undefined properties, so the columns that only a finished transaction
			// carries are nulled through an update instead
			await this.bridgeTransactionRepository.update(entity.id, {
				status: item.status,
				isRefund: item.isRefund,
				destinationTxHash: item.destinationTxHash ?? (() => 'NULL'),
				finishedAt: () => 'NULL',
			});

			Logger.log(
				`rolled ${entity.sourceTxHash} back from ${entity.status} to ${item.status}, the oracle still has it in flight`,
			);
		}
	}

	private isSupported(item: OracleBridgingRequestState): boolean {
		const chains = Object.values(ChainEnum) as string[];

		if (
			!chains.includes(item.sourceChainId) ||
			!chains.includes(item.destinationChainId)
		) {
			Logger.debug(
				`skipping bridging request state on unknown chains: ${item.sourceChainId} -> ${item.destinationChainId}`,
			);

			return false;
		}

		return true;
	}

	private toBridgeTransaction(
		bridgingMode: BridgingModeEnum,
		item: OracleBridgingRequestState,
	): BridgeTransaction {
		const originChain = item.sourceChainId as ChainEnum;
		const entity = new BridgeTransaction();

		entity.sourceTxHash = this.sourceTxHash(item);
		entity.originChain = originChain;
		entity.destinationChain = item.destinationChainId as ChainEnum;
		entity.status = item.status;
		entity.isRefund = item.isRefund;
		entity.destinationTxHash = item.destinationTxHash || undefined;
		entity.createdAt = this.createdAt(item);
		entity.finishedAt = isFinalStatus(item.status)
			? entity.createdAt
			: undefined;
		entity.txRaw = '';
		entity.isCentralized = false;
		entity.isLayerZero = false;
		entity.isOracleDiscovered = true;
		// these rows have no submitting client, activeFrom must stay null or history hides them
		entity.activeFrom = undefined;
		entity.clientID = null;

		const { details } = item;

		if (details) {
			entity.senderAddress = details.senderAddr;
			entity.receiverAddresses = details.receivers
				.map((receiver) => receiver.address)
				.join(', ');
			// the amount column counts the fees as bridged currency, matching what the frontend
			// reports for transactions submitted through this API
			// (frontend-new/src/lib/bridging/submitTx.ts: bridgingFee + operationFee + amount)
			const currencyWei =
				BigInt(details.amount) +
				BigInt(details.bridgingFee) +
				BigInt(details.operationFee);

			entity.amountWei = currencyWei.toString();
			entity.amount = String(
				convertWeiToDfmByChain(entity.amountWei, originChain),
			);
			entity.tokenAmountWei = details.tokenAmount;
			entity.nativeTokenAmount = String(
				convertWeiToDfmByChain(details.tokenAmount, originChain),
			);
			// this column names a token and never the currency, mirroring transaction.service
			entity.tokenID =
				details.tokenId === this.currencyID(originChain) ? 0 : details.tokenId;

			return entity;
		}

		// A request the oracle observed before it recorded details. The real amount is not
		// recoverable, so stand in the smallest amount it could have been.
		const minimumWei = this.minValueToBridgeWei(bridgingMode);

		entity.senderAddress = '';
		entity.receiverAddresses = '';
		entity.amountWei = minimumWei;
		entity.amount = String(convertWeiToDfmByChain(minimumWei, originChain));
		entity.tokenAmountWei = '0';
		entity.nativeTokenAmount = '0';
		entity.tokenID = 0;

		return entity;
	}

	/**
	 * The oracle returns hex without a 0x prefix for cardano and evm chains, and base58 for solana.
	 * This API stores evm hashes 0x prefixed, the way wallets hand them over, so match that or the
	 * same transaction ends up in history twice under two spellings.
	 */
	private sourceTxHash(item: OracleBridgingRequestState): string {
		const hash = item.sourceTxHash;

		return isEvmChain(item.sourceChainId as ChainEnum) && !hash.startsWith('0x')
			? `0x${hash}`
			: hash;
	}

	/** States stored before the oracle recorded a creation time come back as the zero time. */
	private createdAt(item: OracleBridgingRequestState): Date {
		const createdAt = new Date(item.createdAt);

		return Number.isNaN(createdAt.getTime()) ||
			createdAt.getUTCFullYear() < 1970
			? new Date(0)
			: createdAt;
	}

	private currencyID(chain: ChainEnum): number | undefined {
		return getCurrencyIDFromDirectionConfig(
			this.settingsService.SettingsResponse.directionConfig,
			chain,
		);
	}

	private minValueToBridgeWei(bridgingMode: BridgingModeEnum): string {
		const settings =
			this.settingsService.SettingsResponse.settingsPerMode[bridgingMode];

		return String(
			convertDfmToWei(settings?.bridgingSettings?.minValueToBridge ?? 0),
		);
	}
}
