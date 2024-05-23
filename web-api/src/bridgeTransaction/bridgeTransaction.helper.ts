import { BridgingRequestStateDto } from 'src/blockchain/dto';
import { BridgeTransaction } from './bridgeTransaction.entity';
import axios from 'axios';
import { TransactionStatusEnum } from 'src/common/enum';

export const BridgingRequestNotFinalStates = [
	TransactionStatusEnum.Pending,
	TransactionStatusEnum.DiscoveredOnSource,
	TransactionStatusEnum.SubmittedToBridge,
	TransactionStatusEnum.IncludedInBatch,
	TransactionStatusEnum.SubmittedToDestination,
	TransactionStatusEnum.FailedToExecuteOnDestination,
];

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

	const response = await axios.get(apiUrl, {
		headers: {
			'X-API-KEY': oracleApiKey,
		},
	});

	return response.data as { [key: string]: BridgingRequestStateDto };
};

export const updateBridgeTransactionStates = (
	entities: BridgeTransaction[],
	newBridgingRequestStates: { [key: string]: BridgingRequestStateDto },
) => {
	const statusUpdatedBridgeTransactions: BridgeTransaction[] = [];

	const notFinalStates: { [key: string]: boolean } =
		BridgingRequestNotFinalStates.reduce(
			(acc: { [key: string]: boolean }, cv: TransactionStatusEnum) => ({
				...acc,
				[cv]: true,
			}),
			{},
		);

	for (const entity of entities) {
		const state = newBridgingRequestStates[entity.sourceTxHash];
		if (!state) {
			continue;
		}

		if (entity.status !== state.status) {
			entity.status = state.status;
			if (!notFinalStates[entity.status]) {
				entity.finishedAt = new Date();
			}

			statusUpdatedBridgeTransactions.push(entity);
		}
	}

	return statusUpdatedBridgeTransactions;
};
