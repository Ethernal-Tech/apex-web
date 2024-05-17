import { BridgingRequestStateDto } from 'src/blockchain/dto';
import { BridgeTransaction } from './bridgeTransaction.entity';
import { TransactionStatusEnum } from 'src/common/enum';

export const getBridgingRequestStates = async (
	chainId: string,
	txHashes: string[],
) => {
	const oracleUrl = process.env.ORACLE_URL || 'http://localhost:40000';
	const oracleApiKey = process.env.ORACLE_API_KEY || 'test_api_key';
	let apiUrl =
		oracleUrl + `/api/BridgingRequestState/GetMultiple?chainId=${chainId}`;

	for (const txHash of txHashes) {
		apiUrl += `&txHash=${txHash}`;
	}

	const response = await fetch(apiUrl, {
		headers: {
			'X-API-KEY': oracleApiKey,
		},
	});

	const jsonResponse = await response.json();

	return jsonResponse as BridgingRequestStateDto[];
};

export const isBridgeTransactionStateFinal = (entity: BridgeTransaction) => {
	const status = entity.status;
	return (
		status === TransactionStatusEnum.InvalidRequest ||
		status === TransactionStatusEnum.ExecutedOnDestination
	);
};

export const getNotFinalStateBridgeTransactions = (
	entities: BridgeTransaction[],
) => {
	return entities.filter((entity) => !isBridgeTransactionStateFinal(entity));
};

export const updateBridgeTransactionStates = (
	entities: BridgeTransaction[],
	newBridgingRequestStates: BridgingRequestStateDto[],
) => {
	const statusUpdatedBridgeTransactions: BridgeTransaction[] = [];

	for (const bridgeRequestState of newBridgingRequestStates) {
		const currentEntity = entities.find(
			(entity) => entity.sourceTxHash === bridgeRequestState.sourceTxHash,
		);
		if (currentEntity && currentEntity.status !== bridgeRequestState.status) {
			currentEntity.status = bridgeRequestState.status;
			statusUpdatedBridgeTransactions.push(currentEntity);
		}
	}
	return statusUpdatedBridgeTransactions;
};
