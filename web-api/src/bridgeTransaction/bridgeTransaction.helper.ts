import { BridgeTransaction } from './bridgeTransaction.entity';
import axios, { AxiosError } from 'axios';
import { ChainEnum, TransactionStatusEnum } from 'src/common/enum';
import { BridgeTransactionDto } from './bridgeTransaction.dto';
import { capitalizeWord } from 'src/utils/stringUtils';
import { Transaction as CardanoTransaction } from '@emurgo/cardano-serialization-lib-nodejs';
import { Utxo } from 'src/blockchain/dto';
import { Transaction as EthTransaction } from 'web3-types';
import { Logger } from '@nestjs/common';
import { isCardanoChain, isEvmChain } from 'src/utils/chainUtils';

export const BridgingRequestNotFinalStates = [
	TransactionStatusEnum.Pending,
	TransactionStatusEnum.DiscoveredOnSource,
	TransactionStatusEnum.SubmittedToBridge,
	TransactionStatusEnum.IncludedInBatch,
	TransactionStatusEnum.SubmittedToDestination,
	TransactionStatusEnum.FailedToExecuteOnDestination,
];

export const BridgingRequestNotFinalStatesMap: { [key: string]: boolean } =
	BridgingRequestNotFinalStates.reduce(
		(acc: { [key: string]: boolean }, cv: TransactionStatusEnum) => ({
			...acc,
			[cv]: true,
		}),
		{},
	);

export type BridgingRequestState = {
	sourceTxHash: string;
	status: TransactionStatusEnum;
	destinationTxHash?: string;
	isRefund: boolean;
};

export type GetBridgingRequestStatesModel = {
	txHash: string;
	destinationChainId: ChainEnum;
	txRaw: string;
};

export const getBridgingRequestStates = async (
	chainId: string,
	models: GetBridgingRequestStatesModel[],
) => {
	const oracleUrl = process.env.ORACLE_URL || 'http://localhost:40000';
	const oracleApiKey = process.env.ORACLE_API_KEY || 'test_api_key';
	let endpointUrl =
		oracleUrl + `/api/BridgingRequestState/GetMultiple?chainId=${chainId}`;

	for (const model of models) {
		endpointUrl += `&txHash=${model.txHash}`;
	}

	Logger.debug(`axios.get: ${endpointUrl}`);
	try {
		const response = await axios.get(endpointUrl, {
			headers: {
				'X-API-KEY': oracleApiKey,
			},
		});

		Logger.debug(`axios.response: ${JSON.stringify(response.data)}`);
		return response.data as { [key: string]: BridgingRequestState };
	} catch (e) {
		if (e instanceof AxiosError) {
			Logger.error(
				`Error while getBridgingRequestStates: ${e}. response: ${JSON.stringify(e.response?.data)}`,
				e.stack,
			);
		} else {
			Logger.error(`Error while getBridgingRequestStates: ${e}`, e.stack);
		}
		return {};
	}
};

export type HasTxFailedResponse = {
	failed: boolean;
};

export const getHasTxFailedRequestStates = async (
	chainId: string,
	models: GetBridgingRequestStatesModel[],
) => {
	const states = await Promise.all(
		models.map((model) => getHasTxFailedRequestState(chainId, model)),
	);

	return states.reduce((acc: { [key: string]: BridgingRequestState }, cv) => {
		if (cv) {
			acc[cv.sourceTxHash] = cv;
		}

		return acc;
	}, {});
};

export const getHasTxFailedRequestState = async (
	chainId: string,
	model: GetBridgingRequestStatesModel,
): Promise<BridgingRequestState | undefined> => {
	if (!model.txRaw) {
		return;
	}

	let ttl: bigint | undefined;
	if (isCardanoChain(chainId as ChainEnum)) {
		ttl = getCardanoTTL(model.txRaw);
	} else if (isEvmChain(chainId as ChainEnum)) {
		ttl = getEthTTL(model.txRaw);
	}

	if (!ttl) {
		return;
	}

	const oracleUrl = process.env.ORACLE_URL || 'http://localhost:40000';
	const oracleApiKey = process.env.ORACLE_API_KEY || 'test_api_key';
	const endpointUrl =
		oracleUrl +
		`/api/OracleState/GetHasTxFailed?chainId=${chainId}&txHash=${model.txHash}&ttl=${ttl.toString(10)}`;

	Logger.debug(`axios.get: ${endpointUrl}`);
	try {
		const response = await axios.get(endpointUrl, {
			headers: {
				'X-API-KEY': oracleApiKey,
			},
		});

		Logger.debug(`axios.response: ${JSON.stringify(response.data)}`);

		const responseData = response.data as HasTxFailedResponse;
		if (!responseData.failed) {
			return;
		}

		return {
			sourceTxHash: model.txHash,
			status: TransactionStatusEnum.InvalidRequest,
		} as BridgingRequestState;
	} catch (e) {
		if (e instanceof AxiosError) {
			Logger.error(
				`Error while getHasTxFailedRequestState: ${e}. response: ${JSON.stringify(e.response?.data)}`,
				e.stack,
			);
		} else {
			Logger.error(`Error while getHasTxFailedRequestState: ${e}`, e.stack);
		}
	}
};

export const getCentralizedBridgingRequestStates = async (
	chainId: string,
	models: GetBridgingRequestStatesModel[],
): Promise<{ [key: string]: BridgingRequestState }> => {
	const states = await Promise.all(
		models.map((model) => getCentralizedBridgingRequestState(chainId, model)),
	);

	return states.reduce((acc: { [key: string]: BridgingRequestState }, cv) => {
		if (cv) {
			acc[cv.sourceTxHash] = cv;
		}

		return acc;
	}, {});
};

export const getCentralizedBridgingRequestState = async (
	chainId: string,
	model: GetBridgingRequestStatesModel,
): Promise<BridgingRequestState | undefined> => {
	const centralizedApiUrl =
		process.env.CENTRALIZED_API_URL || 'http://localhost:40000';

	const direction = `${chainId}To${capitalizeWord(model.destinationChainId)}`;
	const statusApiUrl = `${centralizedApiUrl}/api/txStatus/${direction}/${model.txHash}`;

	try {
		Logger.debug(`axios.get: ${statusApiUrl}`);
		const statusResponse = await axios.get(statusApiUrl);
		Logger.debug(`axios.response: ${JSON.stringify(statusResponse.data)}`);

		if (!statusResponse.data?.status) {
			return;
		}

		const status: TransactionStatusEnum = statusResponse.data.status;
		let destinationTxHash: string = '';

		if (!BridgingRequestNotFinalStatesMap[status]) {
			const apiUrl = `${centralizedApiUrl}/api/bridge/transactions?originChain=${chainId}&sourceTxHash=${model.txHash}`;

			Logger.debug(`axios.get: ${apiUrl}`);
			const response = await axios.get(apiUrl);
			Logger.debug(`axios.response: ${JSON.stringify(response.data)}`);

			if (response.data?.BridgeTransactionResponseDto?.items) {
				const items: any[] = response.data.BridgeTransactionResponseDto.items;
				if (items.length > 0) {
					destinationTxHash = items[0].destinationTxHash;
				}
			}
		}

		return {
			sourceTxHash: model.txHash,
			status,
			destinationTxHash,
		} as BridgingRequestState;
	} catch (e) {
		if (e instanceof AxiosError) {
			Logger.error(
				`Error while getBridgingRequestState: ${e}. response: ${JSON.stringify(e.response?.data)}`,
				e.stack,
			);
		} else {
			Logger.error(`Error while getBridgingRequestState: ${e}`, e.stack);
		}
	}
};

export const updateBridgeTransactionStates = (
	entities: BridgeTransaction[],
	newBridgingRequestStates: { [key: string]: BridgingRequestState },
	txFailedStates: { [key: string]: BridgingRequestState },
) => {
	const statusUpdatedBridgeTransactions: BridgeTransaction[] = [];

	for (const entity of entities) {
		const txHash = entity.sourceTxHash.startsWith('0x')
			? entity.sourceTxHash.substring(2)
			: entity.sourceTxHash;
		const state =
			newBridgingRequestStates[txHash] ||
			newBridgingRequestStates[entity.sourceTxHash];
		const txFailedState =
			txFailedStates[txHash] || txFailedStates[entity.sourceTxHash];

		const statusChanged = state && entity.status !== state.status;
		const txFailed =
			!statusChanged &&
			txFailedState &&
			entity.status === TransactionStatusEnum.Pending;

		const isRefundChanged = state && entity.isRefund !== state.isRefund

		if (statusChanged || isRefundChanged) {
			updateBridgeTransactionState(entity, state);
			statusUpdatedBridgeTransactions.push(entity);
		}

		if (txFailed) {
			updateBridgeTransactionState(entity, txFailedState);
			statusUpdatedBridgeTransactions.push(entity);
		}
	}

	return statusUpdatedBridgeTransactions;
};

const updateBridgeTransactionState = (
	entity: BridgeTransaction,
	state: BridgingRequestState,
) => {
	entity.status = state.status;
	entity.isRefund = state.isRefund;
	if (!BridgingRequestNotFinalStatesMap[entity.status]) {
		entity.destinationTxHash = state.destinationTxHash;
		entity.finishedAt = new Date();
	}
};

export const mapBridgeTransactionToResponse = (
	entity: BridgeTransaction,
): BridgeTransactionDto => {
	const response = new BridgeTransactionDto();
	response.id = entity.id;
	response.senderAddress = entity.senderAddress;
	response.receiverAddresses = entity.receiverAddresses;
	response.destinationChain = entity.destinationChain;
	response.originChain = entity.originChain;
	response.amount = entity.amount.toString();
	response.sourceTxHash = entity.sourceTxHash;
	response.destinationTxHash = entity.destinationTxHash;
	response.status = entity.status;
	response.createdAt = entity.createdAt;
	response.finishedAt = entity.finishedAt;
	response.isRefund = entity.isRefund;
	return response;
};

export const getInputUtxos = (txRaw: string): Utxo[] => {
	const tx = CardanoTransaction.from_hex(txRaw);
	const inputs = tx.body().inputs();
	const inputsLen = inputs.len();

	const utxos: Utxo[] = [];
	for (let i = 0; i < inputsLen; ++i) {
		const input = tx.body().inputs().get(i);
		const inputJs = input.to_js_value();

		utxos.push({ hash: inputJs.transaction_id, index: inputJs.index });
	}

	return utxos;
};

export const getCardanoTTL = (txRaw: string): bigint | undefined => {
	try {
		const tx = CardanoTransaction.from_hex(txRaw);
		const ttl = tx.body().ttl_bignum();
		return ttl ? BigInt(ttl.to_str()) : undefined;
	} catch (e) {
		Logger.warn(`Error while getCardanoTTL: ${e}`, e.stack);
	}
};

type TxWithBlockNumber = EthTransaction & {
	block: string;
};

export const getEthTTL = (txRaw: string): bigint | undefined => {
	try {
		const tx: TxWithBlockNumber = JSON.parse(txRaw, (_: string, value: any) =>
			typeof value === 'string' && value.startsWith('bigint:')
				? BigInt(value.substring('bigint:'.length))
				: value,
		);
		return BigInt(tx.block) + BigInt(process.env.ETH_TX_TTL_INC || 50);
	} catch (e) {
		Logger.warn(`Error while getEthTTL: ${e}`, e.stack);
	}
};
