import { TransactionStatusEnum } from 'src/common/enum';

export type BridgingRequestStateDto = {
	sourceChainId: string;
	sourceTxHash: string;
	inputAddrs: string[];
	destinationChainId: string;
	batchId: number;
	status: TransactionStatusEnum;
	destinationTxHash: string;
	// additionalInfo: string;
};
