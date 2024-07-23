import { CardanoNetworkType, StakeCredential } from "./types"

export interface CardanoAddress {
	GetPayment(): StakeCredential
	GetStake(): StakeCredential
	GetNetwork(): CardanoNetworkType
	Bytes(): Uint8Array
	String(network?: number): string | undefined
}