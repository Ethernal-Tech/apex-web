export const KeyHashSize = 28;

export enum CardanoNetworkType {
	VectorMainNetNetwork = 3,
	VectorTestNetNetwork = 2,
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
