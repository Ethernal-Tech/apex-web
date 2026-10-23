import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BridgeTransactionFilterDto } from 'src/bridgeTransaction/bridgeTransaction.dto';
import { MAX_PAGE, MAX_PER_PAGE } from './dto';

// reactor history is always filtered by sender and origin chain
const requiredFilter = {
	senderAddress: 'addr_test1sender',
	originChain: 'prime',
};

const errorsFor = async (body: object) =>
	(
		await validate(
			plainToInstance(BridgeTransactionFilterDto, {
				...requiredFilter,
				...body,
			}),
		)
	).map((e) => e.property);

describe('PaginatedDto limits', () => {
	it('accepts pagination the frontend uses', async () => {
		expect(await errorsFor({ page: 0, perPage: 50 })).toEqual([]);
		expect(await errorsFor({})).toEqual([]);
	});

	it('rejects oversized and invalid pages', async () => {
		expect(await errorsFor({ perPage: MAX_PER_PAGE + 1 })).toEqual(['perPage']);
		expect(await errorsFor({ perPage: 1_000_000_000 })).toEqual(['perPage']);
		expect(await errorsFor({ perPage: 0 })).toEqual(['perPage']);
		expect(await errorsFor({ perPage: 2.5 })).toEqual(['perPage']);
		expect(await errorsFor({ page: MAX_PAGE + 1 })).toEqual(['page']);
		expect(await errorsFor({ page: -1 })).toEqual(['page']);
	});
});
