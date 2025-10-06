export enum TransactionStatusEnum {
	Pending = 'Pending',
	DiscoveredOnSource = 'DiscoveredOnSource',
	InvalidRequest = 'InvalidRequest',
	SubmittedToBridge = 'SubmittedToBridge',
	IncludedInBatch = 'IncludedInBatch',
	SubmittedToDestination = 'SubmittedToDestination',
	FailedToExecuteOnDestination = 'FailedToExecuteOnDestination',
	ExecutedOnDestination = 'ExecutedOnDestination',
}

export enum ChainApexBridgeEnum {
	Prime = 'prime',
	Vector = 'vector',
	Nexus = 'nexus',
	Cardano = 'cardano',
}

export const ChainEnum = {
	...ChainApexBridgeEnum,
	Base: 'base',
	BNB: 'bsc',
} as const;

export type ChainEnum = (typeof ChainEnum)[keyof typeof ChainEnum];

export const TxTypeEnum = {
	Legacy: 'Legacy',
	London: 'London',
} as const;

export type TxTypeEnum = (typeof TxTypeEnum)[keyof typeof TxTypeEnum];

export enum GroupByTimePeriod {
	Hour = 'hour',
	Day = 'day',
	Week = 'week',
	Month = 'month',
	Year = 'year',
}
