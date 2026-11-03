import { Repository } from 'typeorm';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { StatsService } from './stats.service';

const row = {
	originChain: 'prime',
	destinationChain: 'nexus',
	sampleCount: '20',
	medianSeconds: '301.4',
	p90Seconds: '609.6',
};

describe('StatsService.getBridgingDurations', () => {
	let query: jest.Mock;
	let service: StatsService;

	beforeEach(() => {
		query = jest.fn(() => Promise.resolve([row]));
		service = new StatsService({
			query,
		} as unknown as Repository<BridgeTransaction>);
	});

	it('maps the measured durations of each direction', async () => {
		const result = await service.getBridgingDurations();

		expect(result.directions).toEqual([
			{
				originChain: 'prime',
				destinationChain: 'nexus',
				sampleCount: 20,
				medianSeconds: 301,
				p90Seconds: 610,
			},
		]);
	});

	it('calculates once for concurrent and cached requests', async () => {
		await Promise.all([
			service.getBridgingDurations(),
			service.getBridgingDurations(),
		]);
		await service.getBridgingDurations();

		expect(query).toHaveBeenCalledTimes(1);
	});

	it('returns the previous result when a recalculation fails', async () => {
		const first = await service.getBridgingDurations();

		// expire the cache
		first.calculatedAt = new Date(0);
		query.mockRejectedValueOnce(new Error('db down'));

		expect(await service.getBridgingDurations()).toBe(first);
	});
});
