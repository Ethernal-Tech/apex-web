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

export enum ChainEnum {
	Prime = 'prime',
	Vector = 'vector',
	Nexus = 'nexus',
	Cardano = 'cardano',
}

export const ChainExtendedEnum = {
  ...ChainEnum,
  Sepolia: "sepolia",
  Ethereum: "ethereum",
} as const;

export type ChainExtendedEnum = typeof ChainExtendedEnum[keyof typeof ChainExtendedEnum]; 

export enum GroupByTimePeriod {
	Hour = 'hour',
	Day = 'day',
	Week = 'week',
	Month = 'month',
	Year = 'year',
}
