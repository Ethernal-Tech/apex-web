import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';

/**
 * Runs cron jobs one at a time.
 *
 * The oracle sweep and the status refresh both read and write the same bridge transaction rows, so
 * letting them overlap means a status the refresh just wrote can be overwritten by the older state
 * the sweep read before it started. Every job that touches those rows goes through here and waits
 * its turn instead.
 */
@Injectable()
export class JobLockService {
	/** Resolves once every run queued so far has finished. */
	private tail: Promise<void> = Promise.resolve();

	constructor(private readonly schedulerRegistry: SchedulerRegistry) {}

	/**
	 * Waits for the jobs queued ahead of `jobName` and then runs `work`.
	 *
	 * The job's cron is stopped for the wait as well as the run, so the ticks it cannot service
	 * while it is blocked are dropped rather than piling up behind the lock: a job is at most one
	 * run deep in the queue at any time.
	 */
	async runExclusive(
		jobName: string,
		work: () => Promise<void>,
	): Promise<void> {
		const job = this.schedulerRegistry.getCronJob(jobName);
		job.stop();

		const queuedAhead = this.tail;
		let done!: () => void;
		this.tail = new Promise<void>((resolve) => {
			done = resolve;
		});

		try {
			await queuedAhead;
			await work();
		} catch (error) {
			Logger.error(`Job ${jobName} failed: ${error}`);
		} finally {
			done();
			job.start();

			Logger.debug(`Job ${jobName} executed`);
		}
	}
}
