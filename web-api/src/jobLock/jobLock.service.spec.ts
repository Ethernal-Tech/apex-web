import { SchedulerRegistry } from '@nestjs/schedule';
import { Test, TestingModule } from '@nestjs/testing';
import { JobLockService } from './jobLock.service';

const deferred = () => {
	let resolve!: () => void;
	const promise = new Promise<void>((res) => {
		resolve = res;
	});

	return { promise, resolve };
};

/** Lets the queued runs get as far as they can before the assertions look at them. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('JobLockService', () => {
	let service: JobLockService;
	let jobs: Record<string, { start: jest.Mock; stop: jest.Mock }>;

	beforeEach(async () => {
		jobs = {
			jobA: { start: jest.fn(), stop: jest.fn() },
			jobB: { start: jest.fn(), stop: jest.fn() },
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				JobLockService,
				{
					provide: SchedulerRegistry,
					useValue: { getCronJob: (name: string) => jobs[name] },
				},
			],
		}).compile();

		service = module.get<JobLockService>(JobLockService);
	});

	it('holds a run back until the one before it has finished', async () => {
		const first = deferred();
		const order: string[] = [];

		const runA = service.runExclusive('jobA', async () => {
			order.push('a started');
			await first.promise;
			order.push('a finished');
		});
		const runB = service.runExclusive('jobB', () => {
			order.push('b started');

			return Promise.resolve();
		});

		await flush();

		// jobB's cron is stopped for the wait, not just for its own run
		expect(jobs.jobB.stop).toHaveBeenCalled();
		expect(jobs.jobB.start).not.toHaveBeenCalled();
		expect(order).toEqual(['a started']);

		first.resolve();
		await Promise.all([runA, runB]);

		expect(order).toEqual(['a started', 'a finished', 'b started']);
		expect(jobs.jobA.start).toHaveBeenCalled();
		expect(jobs.jobB.start).toHaveBeenCalled();
	});

	it('lets the queue move on when a run throws', async () => {
		const failing = service.runExclusive('jobA', () =>
			Promise.reject(new Error('boom')),
		);

		await expect(failing).resolves.toBeUndefined();

		const work = jest.fn().mockResolvedValue(undefined);
		await service.runExclusive('jobB', work);

		expect(work).toHaveBeenCalled();
		expect(jobs.jobA.start).toHaveBeenCalled();
	});
});
