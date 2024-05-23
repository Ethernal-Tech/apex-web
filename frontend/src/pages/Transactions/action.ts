import { BridgeTransactionControllerClient, BridgeTransactionFilterDto, CreateTransactionDto, SignTransactionDto, SubmitTransactionDto, TransactionControllerClient } from '../../swagger/apexBridgeApiService';

export const getAction = (id:number) => {
	const client = new BridgeTransactionControllerClient();
	return client.get(id);
}

export const getAllFilteredAction = (body: BridgeTransactionFilterDto) => {
	const client = new BridgeTransactionControllerClient();
	return client.getAllFiltered(body);
}

export const createTransactionAction = (model: CreateTransactionDto) => {
	const client = new TransactionControllerClient();
	return client.createBridgingTransaction(model);
}

export const signTransactionAction = (model: SignTransactionDto) => {
	const client = new TransactionControllerClient();
	return client.signBridgingTransaction(model);
}

export const submitTransactionAction = (model: SubmitTransactionDto) => {
	const client = new TransactionControllerClient();
	return client.submitBridgingTransaction(model);
}