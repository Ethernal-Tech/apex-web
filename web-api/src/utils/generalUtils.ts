import { Logger } from '@nestjs/common';

export const wait = async (durationMs: number) =>
	new Promise((res) => setTimeout(res, durationMs));

export const retryForever = async (
	callback: () => Promise<void> | void,
	retryDelayMs: number = 1000,
) => {
	while (true) {
		try {
			await callback();

			return;
		} catch (e) {
			Logger.error(`Error while retryForever: ${e}`, e.stack);

			await wait(retryDelayMs);
		}
	}
};

export const retry = async (
	callback: () => Promise<void> | void,
	tryCount: number,
	retryDelayMs: number = 1000,
) => {
	for (let i = 0; i < tryCount; ++i) {
		try {
			await callback();

			return;
		} catch (e) {
			Logger.error(`Error while retry: ${e}`, e.stack);

			await wait(retryDelayMs);
		}
	}

	throw new Error(`failed to execute callback. tryCount: ${tryCount}`);
};
