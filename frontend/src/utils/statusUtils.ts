import { TransactionStatusEnum } from '../swagger/apexBridgeApiService';

export function getStatusColor(status: TransactionStatusEnum) {
	switch (status) {
		case TransactionStatusEnum.InvalidRequest:
		case TransactionStatusEnum.FailedToExecuteOnDestination:
			return 'red';
		case TransactionStatusEnum.ExecutedOnDestination:
			return 'green';
		default:
			return 'white';
	}
}