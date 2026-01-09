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

export enum ApexBridgeNetwork {
	MainnetPrime = 'MainnetPrime',
	MainnetVector = 'MainnetVector',
	MainnetNexus = 'MainnetNexus',
	MainnetCardano = 'MainnetCardano',
	MainnetBase = 'MainnetBase',
	MainnetBsc = 'MainnetBsc',
	MainnetPolygon = 'MainnetPolygon',
	TestnetPrime = 'TestnetPrime',
	TestnetVector = 'TestnetVector',
	TestnetNexus = 'TestnetNexus',
	PreviewCardano = 'PreviewCardano',
	TestnetBase = 'TestnetBase',
	TestnetBsc = 'TestnetBsc',
	TestnetPolygon = 'TestnetPolygon',
}

export enum UtxoRetrieverEnum {
	Wallet = 'wallet',
	Blockfrost = 'blockfrost',
	Ogmios = 'ogmios',
}
