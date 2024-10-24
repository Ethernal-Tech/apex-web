import { TransactionStatusEnum } from 'src/common/enum';

export type BridgingRequestStateDto = {
	sourceChainId: string;
	sourceTxHash: string;
	destinationChainId: string;
	status: TransactionStatusEnum;
	destinationTxHash: string;
};

export type Utxo = {
	hash: string;
	index: number;
};
