import { Logger } from '@nestjs/common';

const DEFAULT_RETRY_DELAY_MS = 1000;

export const wait = async (durationMs: number) =>
	new Promise((res) => setTimeout(res, durationMs));

export const retryForever = async <T>(
	callback: () => Promise<T> | T,
	retryDelayMs: number = DEFAULT_RETRY_DELAY_MS,
): Promise<T> => {
	while (true) {
		try {
			return await callback();
		} catch (e) {
			Logger.error(`Error while retryForever: ${e}`, e.stack);

			await wait(retryDelayMs);
		}
	}
};

export const retry = async <T>(
	callback: () => Promise<T> | T,
	tryCount: number,
	retryDelayMs: number = DEFAULT_RETRY_DELAY_MS,
): Promise<T> => {
	for (let i = 0; i < tryCount; ++i) {
		try {
			return await callback();
		} catch (e) {
			Logger.error(`Error while retry: ${e}`, e.stack);

			await wait(retryDelayMs);
		}
	}

	throw new Error(`failed to execute callback. tryCount: ${tryCount}`);
};
