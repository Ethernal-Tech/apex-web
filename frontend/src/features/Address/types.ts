export const KeyHashSize = 28;

export enum CardanoNetworkType {
	MainNetNetwork = 1,
	TestNetNetwork = 0,
}

export enum StakeCredentialType {
	KeyStakeCredentialType = 0,
	ScriptStakeCredentialType = 1,
	EmptyStakeCredentialType = 2,
}

export type StakeCredential = {
	Kind: StakeCredentialType;
	Payload: Uint8Array;
};

export enum SolanaNetworkType {
	MainNetNetwork = 1,
	TestNetNetwork = 0,
}

export const SolanaNetworkTypeMap = {
	[SolanaNetworkType.MainNetNetwork]: 'https://api.mainnet.solana.com',
	[SolanaNetworkType.TestNetNetwork]: 'https://api.testnet.solana.com',
};
