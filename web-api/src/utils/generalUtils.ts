import { Logger } from '@nestjs/common';
import Web3 from 'web3';
import { Numbers } from 'web3-types';
import { EtherUnits } from 'web3-utils';

const DEFAULT_RETRY_DELAY_MS = 1000;

export const wait = async (durationMs: number) =>
	new Promise((res) => setTimeout(res, durationMs));

export const retryForever = async <T>(
	callback: () => Promise<T> | T,
	retryDelayMs: number = DEFAULT_RETRY_DELAY_MS,
): Promise<T> => {
	// eslint-disable-next-line no-constant-condition
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

const fromWei = (number: Numbers, unit: EtherUnits | number): string => {
	const val = Web3.utils.fromWei(number, unit);
	return val.endsWith('.') ? val.slice(0, -1) : val;
};

const toWei = (number: Numbers, unit: EtherUnits | number): string => {
	const val = Web3.utils.toWei(number, unit);
	return val.endsWith('.') ? val.slice(0, -1) : val;
};

export const convertDfmToApex = (dfm: string | number): string => {
	return fromWei(dfm, 'lovelace');
};

export const convertApexToDfm = (apex: string | number): string => {
	return toWei(apex, 'lovelace');
};

export const convertWeiToApex = (wei: string | number): string => {
	return fromWei(wei, 'ether');
};

export const convertApexToWei = (apex: string | number): string => {
	return toWei(apex, 'ether');
};

export const convertWeiToDfm = (wei: string | number): string => {
	return fromWei(wei, 12);
};

export const convertDfmToWei = (dfm: string | number): string => {
	return toWei(dfm, 12);
};
