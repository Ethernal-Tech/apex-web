import { Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
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
	isLayerZero: boolean;
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

	if (tx.isLayerZero) {
		amount = value;

		// native OFT adapter: tx value covers the sent amount. Otherwise the OFT is
		// a token and the value only pays the LayerZero fee
		const sentAmount = BigInt(tx.receivers[0]?.amount || '0');
		if (value < sentAmount) {
			tokenAmount = sentAmount;
			tokenID =
				getCurrencyIDFromDirectionConfig(directionConfig, ChainEnum.Nexus) ?? 0;
		} else {
			tokenAmount = BigInt(0);
		}
	} else if (isEvmChain(originChain)) {
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
		sourceTxHash: tx.txHash,
		originChain,
		destinationChain: tx.destinationChainId,
		senderAddress: tx.senderAddr,
		receiverAddresses: tx.receivers
			.map((r) => (r.address ?? '').trim())
			.filter(Boolean)
			.join(', '),
		amount: amount.toString(),
		amountWei: String(convertDfmToWeiByChain(amount.toString(), originChain)),
		nativeTokenAmount: tokenAmount.toString(),
		tokenAmountWei: String(
			convertDfmToWeiByChain(tokenAmount.toString(), originChain),
		),
		tokenID,
		isLayerZero: tx.isLayerZero,
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
