import { BridgeTransactionControllerClient, BridgeTransactionFilterDto } from '../../swagger/apexBridgeApiService';

export const getAction = (id:number) => {
	const client = new BridgeTransactionControllerClient();
	return client.get(id);
}

export const getAllFilteredAction = (body: BridgeTransactionFilterDto) => {
	const client = new BridgeTransactionControllerClient();
	return client.getAllFiltered(body);
}