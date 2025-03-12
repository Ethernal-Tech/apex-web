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

export enum TokenEnum {
	Ada = 'Ada',
	WAda = 'WAda',
	APEX = 'APEX',
	WAPEX = 'WAPEX',
}

export enum ApexBridgeNetwork {
    MainnetPrime = 'MainnetPrime',
    MainnetVector = 'MainnetVector',
    MainnetNexus = 'MainnetNexus',
    MainnetCardano = 'MainnetCardano',
    TestnetPrime = 'TestnetPrime',
    TestnetVector = 'TestnetVector',
    TestnetNexus = 'TestnetNexus',
    PreviewCardano = 'PreviewCardano',
}