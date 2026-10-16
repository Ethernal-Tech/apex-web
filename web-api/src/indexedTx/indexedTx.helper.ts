import { Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { QueryFailedError } from 'typeorm';
import { getAppConfig } from 'src/appConfig/appConfig';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { serializeConstructedTxRaw } from 'src/bridgeTransaction/bridgeTransaction.helper';
import { ChainEnum, TransactionStatusEnum } from 'src/common/enum';
import { isEvmChain } from 'src/utils/chainUtils';
import { convertDfmToWeiByChain } from 'src/utils/generalUtils';

/** Bridging transaction observed on the source chain by cardano-api */
export type IndexedBridgingTx = {
	seq: number;
	originChainId: string;
	txHash: string;
	destinationChainId: string;
	senderAddr: string;
	receivers: { address: string; amount: string; tokenID: number }[];
	bridgingFee: string;
	operationFee: string;
	value: string;
	blockNumber: number;
	blockHash: string;
	ttl: number;
	indexedAt: string;
};

export type IndexedBridgingTxsResponse = {
	txs: IndexedBridgingTx[];
	lastSeq: number;
	hasGap: boolean;
	cursorAhead: boolean;
};

let indexerDisabledWarned = false;

export const fetchIndexedBridgingTxs = async (
	after: string,
	limit: number,
): Promise<IndexedBridgingTxsResponse | undefined> => {
	const apiUrl = getAppConfig().cardanoApiUrl;
	const apiKey = process.env.CARDANO_API_API_KEY || 'test_api_key';
	const endpointUrl = `${apiUrl}/api/BridgingTx/GetNew?after=${after}&limit=${limit}`;

	try {
		const response = await axios.get(endpointUrl, {
			headers: { 'X-API-KEY': apiKey },
			timeout: 10000,
		});

		return response.data as IndexedBridgingTxsResponse;
	} catch (e) {
		if (e instanceof AxiosError && e.response?.status === 404) {
			// cardano-api runs without the indexer, nothing to pull
			if (!indexerDisabledWarned) {
				indexerDisabledWarned = true;
				Logger.warn(
					'Bridging tx indexer is not enabled on cardano-api, bridging transactions will not be recorded',
				);
			}

			return;
		}

		if (e instanceof AxiosError) {
			Logger.error(
				`Error while fetchIndexedBridgingTxs: ${e}. response: ${JSON.stringify(e.response?.data)}`,
				e.stack,
			);
		} else {
			Logger.error(
				`Error while fetchIndexedBridgingTxs: ${e}`,
				(e as Error)?.stack,
			);
		}

		return;
	}
};

/**
 * Removes NUL characters. Addresses come from user controlled tx data (metadata,
 * event strings) and postgres rejects text containing NUL, so a single such tx
 * would otherwise fail to save forever.
 */
export const sanitizeText = (value: string | undefined | null): string =>
	(value ?? '').split('\u0000').join('');

const PG_DATA_EXCEPTION_CLASS = '22';

/**
 * Returns true if saving failed because of the data itself (e.g. invalid
 * encoding, numeric overflow), so retrying the same tx can never succeed.
 * Everything else (unique conflicts, lost connection...) may succeed later.
 */
export const isPermanentSaveError = (e: unknown): boolean => {
	if (!(e instanceof QueryFailedError)) {
		return false;
	}

	const code = (e.driverError as { code?: unknown } | undefined)?.code;

	return typeof code === 'string' && code.startsWith(PG_DATA_EXCEPTION_CLASS);
};

const EVM_ADDRESS_WITHOUT_PREFIX_REGEX = /^[0-9a-fA-F]{40}$/;

/**
 * Cardano metadata stores EVM addresses without the 0x prefix, which EVM nodes
 * do not accept (e.g. when reading the receiver's balance), so it is restored.
 */
export const normalizeReceiverAddress = (
	destinationChain: ChainEnum,
	address: string,
): string =>
	isEvmChain(destinationChain) && EVM_ADDRESS_WITHOUT_PREFIX_REGEX.test(address)
		? `0x${address}`
		: address;

const chainValues = new Set<string>(Object.values(ChainEnum));

const isChain = (chain: string): chain is ChainEnum => chainValues.has(chain);

export type IndexedTxEntityFields = Pick<
	BridgeTransaction,
	| 'sourceTxHash'
	| 'originChain'
	| 'destinationChain'
	| 'senderAddress'
	| 'receiverAddresses'
	| 'amount'
	| 'amountWei'
	| 'nativeTokenAmount'
	| 'tokenAmountWei'
	| 'tokenID'
	| 'isLayerZero'
>;

/**
 * Maps an indexed tx to the fields web-api stores for a bridging transaction,
 * with the same meaning the frontend used when submitting them: amount is the
 * currency sent on the source chain, including the bridging fee (for nexus the
 * tx value). Reactor bridges only the currency, so there are no token amounts.
 *
 * Returns undefined if the chains are not reactor chains.
 */
export const mapIndexedTxToEntityFields = (
	tx: IndexedBridgingTx,
): IndexedTxEntityFields | undefined => {
	if (!isChain(tx.originChainId) || !isChain(tx.destinationChainId)) {
		return;
	}

	const originChain = tx.originChainId;
	const destinationChain = tx.destinationChainId;

	let amount: bigint;

	if (isEvmChain(originChain)) {
		amount = BigInt(tx.value || '0');
	} else {
		amount = tx.receivers.reduce(
			(sum, receiver) => sum + BigInt(receiver.amount || '0'),
			BigInt(tx.bridgingFee || '0') + BigInt(tx.operationFee || '0'),
		);
	}

	return {
		sourceTxHash: sanitizeText(tx.txHash),
		originChain,
		destinationChain,
		senderAddress: sanitizeText(tx.senderAddr),
		receiverAddresses: tx.receivers
			.map((r) =>
				normalizeReceiverAddress(
					destinationChain,
					sanitizeText(r.address).trim(),
				),
			)
			.filter(Boolean)
			.join(', '),
		amount: amount.toString(),
		amountWei: convertDfmToWeiByChain(amount.toString(), originChain),
		nativeTokenAmount: '0',
		tokenAmountWei: '0',
		tokenID: 0,
		isLayerZero: false,
	};
};

/**
 * Applies an indexed tx to an existing bridging transaction or creates a new one.
 * Fields describing the request are taken from the chain, while the state of the
 * request (status, destination tx, refund...) is left to the status update job.
 */
export const applyIndexedTx = (
	entity: BridgeTransaction | undefined,
	tx: IndexedBridgingTx,
	fields: IndexedTxEntityFields,
	now: Date,
): BridgeTransaction => {
	const result = entity ?? new BridgeTransaction();

	Object.assign(result, fields);

	if (!entity) {
		const indexedAt = new Date(tx.indexedAt);

		result.status = TransactionStatusEnum.Pending;
		result.createdAt = isNaN(indexedAt.getTime()) ? now : indexedAt;
	}

	if (!result.txRaw && tx.ttl > 0) {
		result.txRaw = serializeConstructedTxRaw(BigInt(tx.ttl));
	}

	// the tx is on the chain, so it is active and can not be changed by clients anymore
	if (!result.activeFrom || result.activeFrom > now) {
		result.activeFrom = now;
	}

	result.clientID = null;

	return result;
};
