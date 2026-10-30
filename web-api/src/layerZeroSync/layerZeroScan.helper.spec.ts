import axios, { AxiosError, AxiosHeaders } from 'axios';
import { getLayerZeroOAppMessages } from './layerZeroScan.helper';

jest.mock('src/appConfig/appConfig', () => ({
	getAppConfig: () => ({
		layerZero: { scanUrl: 'https://scan.example' },
	}),
}));

const axiosGet = jest.spyOn(axios, 'get');

const axiosError = (status: number) =>
	new AxiosError('failed', String(status), undefined, undefined, {
		status,
		statusText: '',
		headers: {},
		config: { headers: new AxiosHeaders() },
		data: { message: 'Message not found', code: status * 10 },
	});

describe('getLayerZeroOAppMessages', () => {
	afterEach(() => axiosGet.mockReset());

	it('returns a page with its next token', async () => {
		axiosGet.mockResolvedValueOnce({
			data: { data: [{ pathway: { srcEid: 1, dstEid: 2 } }], nextToken: 'n' },
		});

		const page = await getLayerZeroOAppMessages(30102, '0xoft', 50);

		expect(page?.messages).toHaveLength(1);
		expect(page?.nextToken).toBe('n');
	});

	it('treats 404 after the last page as the end of the listing', async () => {
		axiosGet.mockRejectedValueOnce(axiosError(404));

		const page = await getLayerZeroOAppMessages(30102, '0xoft', 50, 'last');

		expect(page).toEqual({ messages: [] });
	});

	it('returns undefined when the scan API fails', async () => {
		axiosGet.mockRejectedValueOnce(axiosError(500));

		const page = await getLayerZeroOAppMessages(30102, '0xoft', 50);

		expect(page).toBeUndefined();
	});
});
