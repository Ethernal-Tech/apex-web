import { BridgeTransactionControllerClient, BridgeTransactionFilterDto, CreateTransactionDto, SubmitCardanoTransactionDto, TransactionControllerClient, TransactionSubmittedDto } from '../../swagger/apexBridgeApiService';

export const getAction = (id:number) => {
	const client = new BridgeTransactionControllerClient();
	return client.get(id);
}

export const getAllFilteredAction = (body: BridgeTransactionFilterDto) => {
	const client = new BridgeTransactionControllerClient();
	return client.getAllFiltered(body);
}

export const createCardanoTransactionAction = (model: CreateTransactionDto) => {
	const client = new TransactionControllerClient();
	return client.createCardano(model);
}

export const submitCardanoTransactionAction = (model: SubmitCardanoTransactionDto) => {
	const client = new TransactionControllerClient();
	return client.submitCardano(model);
}

export const createEthTransactionAction = (model: CreateTransactionDto) => {
	const client = new TransactionControllerClient();
	return client.createEth(model);
}

export const bridgingTransactionSubmittedAction = (model: TransactionSubmittedDto) => {
	const client = new TransactionControllerClient();
	return client.bridgingTransactionSubmitted(model);
}