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
    ETH = 'ETH',
    BAP3X = 'bAP3X',
    BNAP3X = 'bnAP3X',
    BNB = 'BNB',
    SOL = 'SOL',
    SAPEX = 'sAP3X'
}

export enum ApexBridgeNetwork {
    MainnetPrime = 'MainnetPrime',
    MainnetVector = 'MainnetVector',
    MainnetNexus = 'MainnetNexus',
    MainnetCardano = 'MainnetCardano',
    MainnetBase = "MainnetBase",
    MainnetBsc = "MainnetBsc",
    MainnetSolana = "MainnetSolana",
    TestnetPrime = 'TestnetPrime',
    TestnetVector = 'TestnetVector',
    TestnetNexus = 'TestnetNexus',
    PreviewCardano = 'PreviewCardano',
    TestnetBase = "TestnetBase",
    TestnetBsc = 'TestnetBsc',
    TestnetSolana = 'TestnetSolana',

}

export enum UtxoRetrieverEnum {
    Wallet = 'wallet',
    Blockfrost = 'blockfrost',
    Ogmios = 'ogmios',
}