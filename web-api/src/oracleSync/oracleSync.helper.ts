import { Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { BridgingModeEnum, TransactionStatusEnum } from 'src/common/enum';
import { getUrlAndApiKey } from 'src/utils/generalUtils';

const REQUEST_TIMEOUT_MS = 15000;

/** All amounts are decimal strings of wei, they do not fit in a JS number. */
export type OracleBridgingRequestStateReceiver = {
	address: string;
	amount: string;
	tokenId: number;
};

export type OracleBridgingRequestStateDetails = {
	senderAddr: string;
	receivers: OracleBridgingRequestStateReceiver[];
	amount: string;
	tokenAmount: string;
	tokenId: number;
	bridgingFee: string;
	operationFee: string;
};

export type OracleBridgingRequestState = {
	sourceChainId: string;
	sourceTxHash: string;
	destinationChainId: string;
	status: TransactionStatusEnum;
	destinationTxHash?: string;
	isRefund: boolean;
	createdAt: string;
	/** Null for refunds and for requests the oracle observed before it recorded details. */
	details: OracleBridgingRequestStateDetails | null;
};

export type OracleBridgingRequestStatePage = {
	instanceId: string;
	nextFrom: number;
	hasMore: boolean;
	items: OracleBridgingRequestState[];
};

/**
 * Fetches one page of bridging request states in the order the oracle observed them.
 * Returns null on failure so the caller leaves its cursor where it is and retries next tick.
 */
export const getBridgingRequestStatePage = async (
	bridgingMode: BridgingModeEnum,
	from: string,
	limit: number,
): Promise<OracleBridgingRequestStatePage | null> => {
	const { url, apiKey } = getUrlAndApiKey(bridgingMode, true);
	const endpointUrl =
		url + `/api/BridgingRequestState/GetPage?from=${from}&limit=${limit}`;

	Logger.debug(`axios.get: ${endpointUrl}`);
	try {
		const response = await axios.get(endpointUrl, {
			headers: { 'X-API-KEY': apiKey },
			timeout: REQUEST_TIMEOUT_MS,
		});

		return response.data as OracleBridgingRequestStatePage;
	} catch (e) {
		if (e instanceof AxiosError) {
			Logger.error(
				`Error while getBridgingRequestStatePage: ${e}. response: ${JSON.stringify(e.response?.data)}`,
				e.stack,
			);
		} else {
			Logger.error(`Error while getBridgingRequestStatePage: ${e}`, e.stack);
		}

		return null;
	}
};
