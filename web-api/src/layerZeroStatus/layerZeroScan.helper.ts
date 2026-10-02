import { Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { getAppConfig } from 'src/appConfig/appConfig';
import { TransactionStatusEnum } from 'src/common/enum';

const REQUEST_TIMEOUT_MS = 15000;

/** The parts of a LayerZero scan message this API reads. */
export type LayerZeroMessage = {
	status: TransactionStatusEnum;
	pathway: {
		srcEid: number;
		dstEid: number;
	};
	source: {
		txHash?: string;
		/** Sender of the source transaction, 0x prefixed lowercase. */
		from?: string;
		sentAt?: Date;
	};
	destination: {
		txHash?: string;
		/** When the message was executed on the destination chain. */
		deliveredAt?: Date;
	};
	/**
	 * The OFT message body: a 32 byte receiver word followed by the amount in
	 * shared decimals. Absent on messages that are not OFT transfers.
	 */
	payload?: string;
};

/** The shape of `data[0]` in a scan API answer. Only the read fields are typed. */
type LayerZeroScanMessage = {
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
	status?: { name?: string; message?: string };
};

/**
 * The message LayerZero recorded for a source transaction, or undefined when the
 * scan API cannot be reached or does not know the transaction yet - a message is
 * only indexed a short while after the source transaction is mined.
 */
export const getLayerZeroMessage = async (
	txHash: string,
): Promise<LayerZeroMessage | undefined> => {
	const layerZeroUrl = getAppConfig().layerZero.scanUrl;
	if (!layerZeroUrl) {
		Logger.error('layer zero scan url not set');

		return;
	}

	const endpointUrl = `${layerZeroUrl}/messages/tx/${txHash}`;

	Logger.debug(`axios.get: ${endpointUrl}`);
	try {
		const response = await axios.get(endpointUrl, {
			timeout: REQUEST_TIMEOUT_MS,
		});

		Logger.debug(`axios.response: ${JSON.stringify(response.data)}`);

		const data = response.data?.data?.[0] as LayerZeroScanMessage | undefined;
		if (!data) {
			return;
		}

		return parseLayerZeroMessage(data);
	} catch (e) {
		if (e instanceof AxiosError) {
			Logger.error(
				`Error while getLayerZeroMessage: ${e}. response: ${JSON.stringify(e.response?.data)}`,
				e.stack,
			);
		} else {
			Logger.error(`Error while getLayerZeroMessage: ${e}`, (e as Error).stack);
		}
	}
};

/** One page of an OApp's messages, newest first. */
export type LayerZeroMessagePage = {
	messages: LayerZeroMessage[];
	/** Feed back to read the page below this one. Absent at the end of the listing. */
	nextToken?: string;
};

/**
 * The messages LayerZero recorded for an OApp on one endpoint, newest first, or
 * undefined when the scan API cannot be reached - the caller keeps its cursor and
 * retries next tick.
 *
 * The listing carries both directions: a message is returned for the endpoint it
 * leaves as well as the one it arrives on, so reading one endpoint already covers
 * every pathway that touches it.
 */
export const getLayerZeroOAppMessages = async (
	eid: number,
	oappAddress: string,
	limit: number,
	nextToken?: string,
): Promise<LayerZeroMessagePage | undefined> => {
	const layerZeroUrl = getAppConfig().layerZero.scanUrl;
	if (!layerZeroUrl) {
		Logger.error('layer zero scan url not set');

		return;
	}

	const endpointUrl = `${layerZeroUrl}/messages/oapp/${eid}/${oappAddress}`;

	Logger.debug(`axios.get: ${endpointUrl} limit=${limit}`);
	try {
		const response = await axios.get(endpointUrl, {
			params: { limit, ...(nextToken ? { nextToken } : {}) },
			timeout: REQUEST_TIMEOUT_MS,
		});

		const data = (response.data?.data ?? []) as LayerZeroScanMessage[];

		return {
			messages: data.map(parseLayerZeroMessage),
			nextToken: response.data?.nextToken,
		};
	} catch (e) {
		if (e instanceof AxiosError) {
			Logger.error(
				`Error while getLayerZeroOAppMessages for ${oappAddress} on ${eid}: ${e}. response: ${JSON.stringify(e.response?.data)}`,
				e.stack,
			);
		} else {
			Logger.error(
				`Error while getLayerZeroOAppMessages for ${oappAddress} on ${eid}: ${e}`,
				(e as Error).stack,
			);
		}
	}
};

const parseLayerZeroMessage = (
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

/** Scan API timestamps are unix seconds. */
const toDate = (blockTimestamp?: number): Date | undefined =>
	typeof blockTimestamp === 'number' && blockTimestamp > 0
		? new Date(blockTimestamp * 1000)
		: undefined;

/**
 * The global status of a message, refined by how far the source and the
 * destination side got:

	global: "INFLIGHT" //  "Source transaction sent"
	source: "VALIDATING_TX"
	destination: "WAITING"
	verification.dvn: "WAITING"
	verification.dvn.dvns: "WAITING"
	verification.sealer: "WAITING"

	global: "INFLIGHT" // Ready for DVNs to verify"
	source: "SUCCEEDED"
	destination: "WAITING"
	verification.dvn: "WAITING"
	verification.dvn.dvns: "VALIDATING_TX"
	verification.sealer: "WAITING"

	global: "INFLIGHT" // Ready for committer to commit verification
	source: "SUCCEEDED"
	destination: "WAITING"
	verification.dvn: "SUCCEEDED"
	verification.dvn.dvns: "SUCCEEDED"
	verification.sealer: "WAITING"

	global: "INFLIGHT" // Verification committed
	source: "SUCCEEDED"
	destination: "WAITING"
	verification.dvn: "SUCCEEDED"
	verification.dvn.dvns: "SUCCEEDED"
	verification.sealer: "SUCCEEDED"

	global: "INFLIGHT" // Executor transaction confirmed
	source: "SUCCEEDED"
	destination: "SUCCEEDED"
	verification.dvn: "SUCCEEDED"
	verification.dvn.dvns: "SUCCEEDED"
	verification.sealer: "SUCCEEDED"

	global: "DELIVERED" // Executor transaction confirmed
	source: "SUCCEEDED"
	destination: "SUCCEEDED"
	verification.dvn: "SUCCEEDED"
	verification.dvn.dvns: "SUCCEEDED"
	verification.sealer: "SUCCEEDED"
 */
export const mapLayerZeroStatus = (
	data: LayerZeroScanMessage,
): TransactionStatusEnum => {
	switch (data.status?.name) {
		case 'INFLIGHT':
			if (data.destination?.status == 'SUCCEEDED') {
				return TransactionStatusEnum.SubmittedToDestination;
			}

			if (data.source?.status == 'SUCCEEDED') {
				return TransactionStatusEnum.SubmittedToBridge;
			}

			return TransactionStatusEnum.DiscoveredOnSource;
		case 'DELIVERED':
			return TransactionStatusEnum.ExecutedOnDestination;
		case 'PAYLOAD_STORED':
			return TransactionStatusEnum.FailedToExecuteOnDestination;
		case 'CONFIRMING':
			return TransactionStatusEnum.SubmittedToDestination;
		case 'FAILED':
		case 'BLOCKED':
		case 'UNRESOLVABLE_COMMAND':
			return TransactionStatusEnum.InvalidRequest;
	}

	return TransactionStatusEnum.Pending;
};

/**
 * The OFT message body is the receiver as a 32 byte word followed by the amount
 * in the OFT's shared decimals, so both come from LayerZero rather than from the
 * chain. A body that is shorter carries neither - it is not an OFT transfer.
 */
export const decodeOftPayload = (
	payload?: string,
): { receiver: string; amountSD: bigint } | undefined => {
	// 0x + a 32 byte word + an 8 byte amount
	if (!payload || payload.length < 2 + 64 + 16) {
		return;
	}

	return {
		receiver: addressFromWord(payload.slice(0, 66)),
		amountSD: BigInt(`0x${payload.slice(66, 82)}`),
	};
};

/** An address ABI encodes as a right aligned 32 byte word. */
export const addressFromWord = (word: string): string =>
	`0x${word.slice(-40)}`.toLowerCase();
