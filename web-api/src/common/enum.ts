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

export enum GroupByTimePeriod {
	Hour = 'hour',
	Day = 'day',
	Week = 'week',
	Month = 'month',
	Year = 'year',
}

export enum BridgingModeEnum {
	Reactor = 'reactor',
	Skyline = 'skyline',
	LayerZero = 'layerzero'
}