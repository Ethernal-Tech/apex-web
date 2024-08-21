import { BridgeTransaction } from './bridgeTransaction.entity';
import axios from 'axios';
import { ChainEnum, TransactionStatusEnum } from 'src/common/enum';
import { BridgeTransactionDto } from './bridgeTransaction.dto';
import { capitalizeWord } from 'src/utils/stringUtils';

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
};

export type GetBridgingRequestStatesModel = {
	txHash: string;
	destinationChainId: ChainEnum;
};

export const getBridgingRequestStates = async (
	chainId: string,
	models: GetBridgingRequestStatesModel[],
) => {
	const oracleUrl = process.env.ORACLE_URL || 'http://localhost:40000';
	const oracleApiKey = process.env.ORACLE_API_KEY || 'test_api_key';
	let apiUrl =
		oracleUrl + `/api/BridgingRequestState/GetMultiple?chainId=${chainId}`;

	for (const model of models) {
		apiUrl += `&txHash=${model.txHash}`;
	}

	try {
		const response = await axios.get(apiUrl, {
			headers: {
				'X-API-KEY': oracleApiKey,
			},
		});

		return response.data as { [key: string]: BridgingRequestState };
	} catch (e) {
		console.error('Error while getBridgingRequestStates', e);
		return {};
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
		const statusResponse = await axios.get(statusApiUrl);
		if (!statusResponse.data?.status) {
			return;
		}

		const status: TransactionStatusEnum = statusResponse.data.status;
		let destinationTxHash: string = '';

		if (!BridgingRequestNotFinalStatesMap[status]) {
			const apiUrl = `${centralizedApiUrl}/api/bridge/transactions?originChain=${chainId}&sourceTxHash=${model.txHash}`;
			const response = await axios.get(apiUrl);

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
		console.error('Error while getBridgingRequestStates', e);
	}
};

export const updateBridgeTransactionStates = (
	entities: BridgeTransaction[],
	newBridgingRequestStates: { [key: string]: BridgingRequestState },
) => {
	const statusUpdatedBridgeTransactions: BridgeTransaction[] = [];

	for (const entity of entities) {
		const txHash = entity.sourceTxHash.startsWith('0x')
			? entity.sourceTxHash.substring(2)
			: entity.sourceTxHash;
		const state =
			newBridgingRequestStates[txHash] ||
			newBridgingRequestStates[entity.sourceTxHash];
		if (!state) {
			continue;
		}

		if (entity.status !== state.status) {
			entity.status = state.status;
			if (!BridgingRequestNotFinalStatesMap[entity.status]) {
				entity.destinationTxHash = state.destinationTxHash;
				entity.finishedAt = new Date();
			}

			statusUpdatedBridgeTransactions.push(entity);
		}
	}

	return statusUpdatedBridgeTransactions;
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
	return response;
};
