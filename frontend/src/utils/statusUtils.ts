import { TransactionStatusEnum } from '../swagger/apexBridgeApiService';

const STATUS_TEXT: { [key: string]: string } = {
	[TransactionStatusEnum.Pending]: "Pending",
    [TransactionStatusEnum.DiscoveredOnSource]: "Discovered on source",
    [TransactionStatusEnum.InvalidRequest]: "Invalid request",
    [TransactionStatusEnum.SubmittedToBridge]: "Submitted to bridge",
    [TransactionStatusEnum.IncludedInBatch]: "Included in batch",
    [TransactionStatusEnum.SubmittedToDestination]: "Submitted to destination",
    [TransactionStatusEnum.FailedToExecuteOnDestination]: "Failed to execute on destination",
    [TransactionStatusEnum.ExecutedOnDestination]: "Executed on destination",
}

const NOT_FINAL_STATES: { [key: string]: boolean } = [
	TransactionStatusEnum.Pending,
	TransactionStatusEnum.DiscoveredOnSource,
	TransactionStatusEnum.SubmittedToBridge,
	TransactionStatusEnum.IncludedInBatch,
	TransactionStatusEnum.SubmittedToDestination,
	TransactionStatusEnum.FailedToExecuteOnDestination,
].reduce((acc, cv) => ({ ...acc, [cv]: true }), {});

export function getStatusColor(status: TransactionStatusEnum) {
	switch (status) {
		case TransactionStatusEnum.InvalidRequest:
		case TransactionStatusEnum.FailedToExecuteOnDestination:
			return 'red';
		case TransactionStatusEnum.ExecutedOnDestination:
			return 'green';
		default:
			return 'none';
	}
}

export function getStatusText(status: TransactionStatusEnum | string) {
	return STATUS_TEXT[status] || status
}

export function isStatusFinal(status: TransactionStatusEnum) {
	return !NOT_FINAL_STATES[status]
}