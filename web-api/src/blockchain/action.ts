import { TransactionStatusEnum } from 'src/common/enum';
import { BridgingRequestStateDto } from './dto';

export const getBridgingRequestState = async (
	chainId: string,
	txHash: string,
): Promise<BridgingRequestStateDto> => {
	// TODO: implement this
	console.log(chainId);
	console.log(txHash);
	return Promise.resolve({
		sourceChainId: 'sourceChainId',
		sourceTxHash: 'sourceTxHash',
		inputAddrs: [],
		destinationChainId: 'destinationChainId',
		batchId: 0,
		status: TransactionStatusEnum.Pending,
		destinationTxHash: 'destinationTxHash',
	});
};

export const getAllBridgingRequestStatesForUser = async (
	chainId: string,
	userAddr: string,
): Promise<BridgingRequestStateDto[]> => {
	// TODO: implement this
	console.log(chainId);
	console.log(userAddr);
	return Promise.resolve([
		{
			sourceChainId: 'sourceChainId',
			sourceTxHash: 'sourceTxHash',
			inputAddrs: [],
			destinationChainId: 'destinationChainId',
			batchId: 0,
			status: TransactionStatusEnum.Pending,
			destinationTxHash: 'destinationTxHash',
		},
	]);
};
