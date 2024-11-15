export enum BridgingRequestState {
	RequestedOnSource = 1,
	RequestedOnDestination = 2,
	Finished = 3,
	Error = 4,
}

export enum WalletErrors {
	NoWalletsAvailable = 1,
	WalletNotEnabled = 2,
}
