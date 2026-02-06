import {
	BridgeTransactionControllerClient,
	BridgeTransactionFilterDto,
	CreateTransactionDto,
	LayerZeroTransferDto,
	TransactionActivateDeleteDto,
	TransactionControllerClient,
	TransactionSubmittedDto,
	TransactionUpdateDto,
} from '../../swagger/apexBridgeApiService';

export const getAction = (id: number) => {
	const client = new BridgeTransactionControllerClient();
	return client.get(id);
};

export const getAllFilteredAction = (body: BridgeTransactionFilterDto) => {
	const client = new BridgeTransactionControllerClient();
	return client.getAllFiltered(body);
};

export const createCardanoTransactionAction = (model: CreateTransactionDto) => {
	const client = new TransactionControllerClient();
	return client.createCardano(model);
};

export const getCardanoTransactionFeeAction = (model: CreateTransactionDto) => {
	const client = new TransactionControllerClient();
	return client.getCardanoTxFee(model);
};

export const createEthTransactionAction = (model: CreateTransactionDto) => {
	const client = new TransactionControllerClient();
	return client.createEth(model);
};

export const bridgingTransactionSubmittedAction = (
	model: TransactionSubmittedDto,
) => {
	const client = new TransactionControllerClient();

	return client.bridgingTransactionSubmitted(model);
};

export const bridgingTransactionUpdateAction = (
	model: TransactionUpdateDto,
) => {
	const client = new TransactionControllerClient();

	return client.bridgingTransactionUpdate(model);
};

export const bridgingTransactionDeleteAction = (
	model: TransactionActivateDeleteDto,
) => {
	const client = new TransactionControllerClient();

	return client.bridgingTransactionDelete(model);
};

export const bridgingTransactionActivateAction = (
	model: TransactionActivateDeleteDto,
) => {
	const client = new TransactionControllerClient();

	return client.bridgingTransactionActivate(model);
};

export const bridgingTransactionSubmittedActivatedAction = (
	model: TransactionSubmittedDto,
) => {
	const client = new TransactionControllerClient();

	return client.bridgingTransactionSubmittedActivated(model);
};

export const layerZeroTransferAction = (model: LayerZeroTransferDto) => {
	const client = new TransactionControllerClient();
	return client.layerZeroTransfer(model);
};
