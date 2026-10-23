import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { ChainEnum, TransactionStatusEnum } from 'src/common/enum';
import { BridgingDurationDto, BridgingDurationsDto } from './stats.dto';

// durations are measured from the latest finished transactions of each direction, so
// they follow changes of tracker settings (e.g. block finality) quickly
export const DURATION_SAMPLE_SIZE = 20;
// transactions finished before this period are not used, even if there are not enough newer ones
export const DURATION_WINDOW_DAYS = 30;
// a direction with fewer finished transactions is left to the frontend fallback
export const DURATION_MIN_SAMPLES = 5;
// no bridging finishes this fast, a shorter duration means the tx was recorded late
// (e.g. indexed while catching up on older blocks) and does not reflect bridging time
export const DURATION_MIN_SECONDS = 30;
const DURATIONS_CACHE_MS = 10 * 60 * 1000;

// the database is shared with skyline, only reactor directions are measured
const REACTOR_CHAINS: string[] = Object.values(ChainEnum);

type DurationRow = {
	originChain: string;
	destinationChain: string;
	sampleCount: string;
	medianSeconds: string;
	p90Seconds: string;
};

@Injectable()
export class StatsService {
	private durations: BridgingDurationsDto | undefined;
	private durationsPromise: Promise<BridgingDurationsDto> | undefined;

	constructor(
		@InjectRepository(BridgeTransaction)
		private readonly bridgeTransactionRepository: Repository<BridgeTransaction>,
	) {}

	/**
	 * How long bridging takes per direction, measured from our own history: from
	 * when the tx was recorded on the source chain until it was executed on the
	 * destination chain. Cached, since it changes slowly.
	 */
	async getBridgingDurations(): Promise<BridgingDurationsDto> {
		if (
			this.durations &&
			Date.now() - this.durations.calculatedAt.getTime() < DURATIONS_CACHE_MS
		) {
			return this.durations;
		}

		// concurrent requests share one calculation
		this.durationsPromise ??= this.calculateBridgingDurations().finally(() => {
			this.durationsPromise = undefined;
		});

		try {
			this.durations = await this.durationsPromise;
		} catch (e) {
			// a stale result is better than none
			if (this.durations) {
				Logger.error(
					`Failed to calculate bridging durations, returning cached ones: ${e}`,
				);

				return this.durations;
			}

			throw e;
		}

		return this.durations;
	}

	private async calculateBridgingDurations(): Promise<BridgingDurationsDto> {
		// refunds take a different path, so only transfers that reached the destination
		// count. Reactor bridges only the currency, so token transfers are not measured
		const rows: DurationRow[] = await this.bridgeTransactionRepository.query(
			`
			SELECT
				"originChain",
				"destinationChain",
				COUNT(*) AS "sampleCount",
				PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration) AS "medianSeconds",
				PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY duration) AS "p90Seconds"
			FROM (
				SELECT
					"originChain",
					"destinationChain",
					EXTRACT(EPOCH FROM ("finishedAt" - "createdAt")) AS duration,
					ROW_NUMBER() OVER (
						PARTITION BY "originChain", "destinationChain"
						ORDER BY "finishedAt" DESC
					) AS position
				FROM "bridgeTransactions"
				WHERE status = $1
					AND "isRefund" = false
					AND "tokenID" = 0
					AND "originChain" = ANY($6)
					AND "destinationChain" = ANY($6)
					AND "finishedAt" IS NOT NULL
					AND "finishedAt" >= "createdAt" + make_interval(secs => $5)
					AND "finishedAt" > NOW() - make_interval(days => $2)
			) latest
			WHERE position <= $3
			GROUP BY "originChain", "destinationChain"
			HAVING COUNT(*) >= $4
			`,
			[
				TransactionStatusEnum.ExecutedOnDestination,
				DURATION_WINDOW_DAYS,
				DURATION_SAMPLE_SIZE,
				DURATION_MIN_SAMPLES,
				DURATION_MIN_SECONDS,
				REACTOR_CHAINS,
			],
		);

		return {
			directions: rows.map(toBridgingDuration),
			calculatedAt: new Date(),
		};
	}
}

const toBridgingDuration = (row: DurationRow): BridgingDurationDto => ({
	originChain: row.originChain,
	destinationChain: row.destinationChain,
	sampleCount: Number(row.sampleCount),
	medianSeconds: Math.round(Number(row.medianSeconds)),
	p90Seconds: Math.round(Number(row.p90Seconds)),
});
