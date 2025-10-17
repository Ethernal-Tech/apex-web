import { Logger } from '@nestjs/common';
import { BridgingModeEnum, ChainEnum } from 'src/common/enum';
import Web3 from 'web3';
import { Numbers } from 'web3-types';
import { EtherUnits } from 'web3-utils';
import { isCardanoChain } from './chainUtils';

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

export const fromWei = (number: Numbers, unit: EtherUnits | number): string => {
	const val = Web3.utils.fromWei(number, unit);
	return val.endsWith('.') ? val.slice(0, -1) : val;
};

export const toWei = (number: Numbers, unit: EtherUnits | number): string => {
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

export type urlAndApiKey = { url: string; apiKey: string };

export const getUrlAndApiKey = (
	bridgingMode: BridgingModeEnum | undefined,
	isOracle: boolean,
): urlAndApiKey => {
	let url: string | undefined;
	let apiKey: string | undefined;

	switch (bridgingMode) {
		case BridgingModeEnum.Reactor:
			url = isOracle
				? process.env.ORACLE_REACTOR_URL
				: process.env.CARDANO_API_REACTOR_URL;
			apiKey = isOracle
				? process.env.ORACLE_REACTOR_API_KEY
				: process.env.CARDANO_API_REACTOR_API_KEY;
			break;
		case BridgingModeEnum.Skyline:
			url = isOracle
				? process.env.ORACLE_SKYLINE_URL
				: process.env.CARDANO_API_SKYLINE_URL;
			apiKey = isOracle
				? process.env.ORACLE_SKYLINE_API_KEY
				: process.env.CARDANO_API_SKYLINE_API_KEY;
			break;
	}

	return {
		url: url || 'http://localhost:40000',
		apiKey: apiKey || 'test_api_key',
	};
};

export const amountToBigInt = (amountStr: string, chain: ChainEnum): bigint => {
	if (isCardanoChain(chain)) {
		return BigInt(amountStr || '0');
	}

	const parts = convertWeiToDfm(amountStr || '0').split('.');
	let increment: bigint = 0n;
	if (parts.length == 2) {
		increment = 1n; // fake rounding
	}

	return BigInt(parts[0]) + increment;
};
