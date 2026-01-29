import {
	BridgeTransactionControllerClient,
	BridgeTransactionFilterDto,
	CreateTransactionDto,
	LayerZeroTransferDto,
	TransactionControllerClient,
	TransactionDeleteDto,
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
	const keepAliveHttp = {
		fetch: (url: RequestInfo, init?: RequestInit) => {
			return window.fetch(url, { ...init, keepalive: true });
		},
	};

	const client = new TransactionControllerClient(undefined, keepAliveHttp);

	return client.bridgingTransactionSubmitted(model);
};

export const bridgingTrasanctionUpdateAction = (
	model: TransactionUpdateDto,
) => {
	const client = new TransactionControllerClient();

	return client.bridgingTransactionUpdate(model);
};

export const bridgingTransactionDeleteAction = (
	model: TransactionDeleteDto,
) => {
	const client = new TransactionControllerClient();

	return client.bridgingTransactionDelete(model);
};

export const layerZeroTransferAction = (model: LayerZeroTransferDto) => {
	const client = new TransactionControllerClient();
	return client.layerZeroTransfer(model);
};
