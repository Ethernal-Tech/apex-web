import { Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { getAppConfig } from 'src/appConfig/appConfig';
import {
	LayerZeroScanStatus,
	mapLayerZeroStatus,
} from 'src/bridgeTransaction/bridgeTransaction.helper';
import { TransactionStatusEnum } from 'src/common/enum';
import { ethCall } from 'src/utils/evmRpc';

const REQUEST_TIMEOUT_MS = 15000;

/** The parts of a LayerZero scan message this API reads */
export type LayerZeroMessage = {
	status: TransactionStatusEnum;
	pathway: { srcEid: number; dstEid: number };
	source: {
		txHash?: string;
		/** sender of the source tx, 0x prefixed */
		from?: string;
		sentAt?: Date;
	};
	destination: {
		txHash?: string;
		deliveredAt?: Date;
	};
	/**
	 * The OFT message body: a 32 byte receiver word followed by the amount in
	 * shared decimals. Absent on messages that are not OFT transfers.
	 */
	payload?: string;
};

/** A message as the scan API returns it. Only the read fields are typed. */
type LayerZeroScanMessage = LayerZeroScanStatus & {
	pathway?: { srcEid?: number; dstEid?: number };
	source?: {
		status?: string;
		tx?: {
			txHash?: string;
			from?: string;
			blockTimestamp?: number;
			payload?: string;
		};
	};
	destination?: {
		status?: string;
		tx?: { txHash?: string; blockTimestamp?: number };
	};
};

/** One page of an OApp's messages, newest first */
export type LayerZeroMessagePage = {
	messages: LayerZeroMessage[];
	/** pass back to read the next (older) page, absent at the end of the listing */
	nextToken?: string;
};

/**
 * The messages LayerZero scan indexed for an OApp (our OFT) on one endpoint,
 * newest first, or undefined when the scan API can not be reached.
 *
 * The listing contains messages in both directions: the ones leaving the
 * endpoint and the ones arriving at it, so one listing covers every pathway
 * that touches the chain.
 */
export const getLayerZeroOAppMessages = async (
	eid: number,
	oappAddress: string,
	limit: number,
	nextToken?: string,
): Promise<LayerZeroMessagePage | undefined> => {
	const scanUrl = getAppConfig().layerZero.scanUrl;
	if (!scanUrl) {
		Logger.error('layer zero scan url not set');

		return;
	}

	const endpointUrl = `${scanUrl}/messages/oapp/${eid}/${oappAddress}`;

	try {
		const response = await axios.get(endpointUrl, {
			params: { limit, ...(nextToken ? { nextToken } : {}) },
			timeout: REQUEST_TIMEOUT_MS,
		});

		const data = (response.data?.data ?? []) as LayerZeroScanMessage[];

		return {
			messages: data.map(parseLayerZeroMessage),
			nextToken: response.data?.nextToken || undefined,
		};
	} catch (e) {
		// the page after the last one is answered with 404 instead of an empty page
		if (e instanceof AxiosError && e.response?.status === 404) {
			Logger.debug(
				`no more layer zero messages for ${oappAddress} on ${eid}: ${JSON.stringify(e.response?.data)}`,
			);

			return { messages: [] };
		}

		if (e instanceof AxiosError) {
			Logger.error(
				`Error while getLayerZeroOAppMessages for ${oappAddress} on ${eid}: ${e}. response: ${JSON.stringify(e.response?.data)}`,
				e.stack,
			);
		} else {
			Logger.error(
				`Error while getLayerZeroOAppMessages for ${oappAddress} on ${eid}: ${e}`,
				(e as Error)?.stack,
			);
		}
	}
};

export const parseLayerZeroMessage = (
	data: LayerZeroScanMessage,
): LayerZeroMessage => ({
	status: mapLayerZeroStatus(data),
	pathway: {
		srcEid: data.pathway?.srcEid ?? 0,
		dstEid: data.pathway?.dstEid ?? 0,
	},
	source: {
		txHash: data.source?.tx?.txHash,
		from: data.source?.tx?.from,
		sentAt: toDate(data.source?.tx?.blockTimestamp),
	},
	destination: {
		txHash: data.destination?.tx?.txHash,
		deliveredAt: toDate(data.destination?.tx?.blockTimestamp),
	},
	payload: data.source?.tx?.payload,
});

/** scan API timestamps are unix seconds */
const toDate = (blockTimestamp?: number): Date | undefined =>
	typeof blockTimestamp === 'number' && blockTimestamp > 0
		? new Date(blockTimestamp * 1000)
		: undefined;

// 0x + a 32 byte receiver word + an 8 byte amount
const OFT_PAYLOAD_MIN_LENGTH = 2 + 64 + 16;

/**
 * Decodes the OFT message body: the receiver as a 32 byte word followed by the
 * amount in the OFT's shared decimals. Returns undefined for a body that is not
 * an OFT transfer.
 */
export const decodeOftPayload = (
	payload?: string,
): { receiver: string; amountSD: bigint } | undefined => {
	if (
		!payload ||
		payload.length < OFT_PAYLOAD_MIN_LENGTH ||
		!/^0x[0-9a-fA-F]+$/.test(payload)
	) {
		return;
	}

	return {
		// an EVM address ABI encodes as a right aligned 32 byte word
		receiver: `0x${payload.slice(2 + 64 - 40, 2 + 64)}`.toLowerCase(),
		amountSD: BigInt(`0x${payload.slice(2 + 64, OFT_PAYLOAD_MIN_LENGTH)}`),
	};
};

/** `decimalConversionRate()` selector */
const DECIMAL_CONVERSION_RATE_SELECTOR = '0x963efcaa';

/**
 * The rate of the usual OFT with 18 local and 6 shared decimals, which every
 * OFT of this bridge uses. Used when the real one can not be read.
 */
export const DEFAULT_DECIMAL_CONVERSION_RATE = BigInt(10) ** BigInt(12);

/**
 * What an OFT multiplies an amount in shared decimals by to get it in local
 * decimals (10^(localDecimals - sharedDecimals)).
 */
export const readDecimalConversionRate = async (
	rpcUrl: string,
	oftAddress: string,
): Promise<bigint> => {
	const rate = BigInt(
		await ethCall(rpcUrl, 'eth_call', [
			{ to: oftAddress, data: DECIMAL_CONVERSION_RATE_SELECTOR },
			'latest',
		]),
	);

	if (rate <= BigInt(0)) {
		throw new Error(`${oftAddress} reported decimal conversion rate ${rate}`);
	}

	return rate;
};
