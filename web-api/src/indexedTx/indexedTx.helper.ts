import { Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { QueryFailedError } from 'typeorm';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { serializeConstructedTxRaw } from 'src/bridgeTransaction/bridgeTransaction.helper';
import {
	BridgingModeEnum,
	ChainEnum,
	TransactionStatusEnum,
} from 'src/common/enum';
import { BridgingSettingsDirectionConfigDto } from 'src/settings/settings.dto';
import { getCurrencyIDFromDirectionConfig } from 'src/settings/utils';
import { isEvmChain } from 'src/utils/chainUtils';
import {
	convertDfmToWeiByChain,
	getUrlAndApiKey,
} from 'src/utils/generalUtils';

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

const indexerDisabledWarned = new Set<BridgingModeEnum>();

export const fetchIndexedBridgingTxs = async (
	bridgingMode: BridgingModeEnum,
	after: string,
	limit: number,
): Promise<IndexedBridgingTxsResponse | undefined> => {
	const { url, apiKey } = getUrlAndApiKey(bridgingMode, false);
	const endpointUrl = `${url}/api/BridgingTx/GetNew?after=${after}&limit=${limit}`;

	try {
		const response = await axios.get(endpointUrl, {
			headers: { 'X-API-KEY': apiKey },
			timeout: 10000,
		});

		return response.data as IndexedBridgingTxsResponse;
	} catch (e) {
		if (e instanceof AxiosError && e.response?.status === 404) {
			// cardano-api runs without the indexer, nothing to pull
			if (!indexerDisabledWarned.has(bridgingMode)) {
				indexerDisabledWarned.add(bridgingMode);
				Logger.warn(
					`Bridging tx indexer is not enabled on cardano-api (${bridgingMode}), bridging transactions will not be recorded`,
				);
			}

			return;
		}

		if (e instanceof AxiosError) {
			Logger.error(
				`Error while fetchIndexedBridgingTxs (${bridgingMode}): ${e}. response: ${JSON.stringify(e.response?.data)}`,
				e.stack,
			);
		} else {
			Logger.error(
				`Error while fetchIndexedBridgingTxs (${bridgingMode}): ${e}`,
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
 * with the same meaning the frontend used when submitting them:
 * - amount: currency sent on the source chain, including bridging and operation
 *   fee (for EVM chains the tx value)
 * - nativeTokenAmount / tokenID: bridged token, if any (tokenID is 0 for currency)
 *
 * Returns undefined if the chains are not known to web-api.
 */
export const mapIndexedTxToEntityFields = (
	tx: IndexedBridgingTx,
	directionConfig: { [key: string]: BridgingSettingsDirectionConfigDto },
): IndexedTxEntityFields | undefined => {
	if (!isChain(tx.originChainId) || !isChain(tx.destinationChainId)) {
		return;
	}

	const originChain = tx.originChainId;
	const currencyID = getCurrencyIDFromDirectionConfig(
		directionConfig,
		originChain,
	);
	const isCurrency = (tokenID: number) =>
		tokenID === 0 || tokenID === currencyID;

	let currencyAmount = BigInt(0);
	let tokenAmount = BigInt(0);
	let tokenID = 0;

	for (const receiver of tx.receivers) {
		if (isCurrency(receiver.tokenID)) {
			currencyAmount += BigInt(receiver.amount || '0');
		} else {
			tokenAmount += BigInt(receiver.amount || '0');
			tokenID = tokenID || receiver.tokenID;
		}
	}

	let amount: bigint;
	const value = BigInt(tx.value || '0');

	if (isEvmChain(originChain)) {
		amount = value;
	} else {
		amount =
			currencyAmount +
			BigInt(tx.bridgingFee || '0') +
			BigInt(tx.operationFee || '0');
	}

	if (tokenAmount === BigInt(0)) {
		tokenID = 0;
	}

	return {
		sourceTxHash: sanitizeText(tx.txHash),
		originChain,
		destinationChain: tx.destinationChainId,
		senderAddress: sanitizeText(tx.senderAddr),
		receiverAddresses: tx.receivers
			.map((r) =>
				normalizeReceiverAddress(
					tx.destinationChainId as ChainEnum,
					sanitizeText(r.address).trim(),
				),
			)
			.filter(Boolean)
			.join(', '),
		amount: amount.toString(),
		amountWei: String(convertDfmToWeiByChain(amount.toString(), originChain)),
		nativeTokenAmount: tokenAmount.toString(),
		tokenAmountWei: String(
			convertDfmToWeiByChain(tokenAmount.toString(), originChain),
		),
		tokenID,
		// LayerZero transfers are recorded from LayerZero scan (layerZeroSync)
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
