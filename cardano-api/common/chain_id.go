package common

const (
	ChainIDStrPrime    = "prime"
	ChainIDStrVector   = "vector"
	ChainIDStrNexus    = "nexus"
	ChainIDStrCardano  = "cardano"
	ChainIDStrPolygon  = "polygon"
	ChainIDStrEthereum = "ethereum"
	ChainIDStrKatana   = "katana"
	ChainIDStrSei      = "sei"
	ChainIDStrArbitrum = "arbitrum"
	ChainIDStrScroll   = "scroll"
	ChainIDStrUnichain = "unichain"
	ChainIDStrSolana   = "solana"
)

func IsCardanoChainID(chainID string) bool {
	return chainID == ChainIDStrCardano ||
		chainID == ChainIDStrPrime ||
		chainID == ChainIDStrVector
}

func IsEvmChainID(chainID string) bool {
	return chainID == ChainIDStrNexus ||
		chainID == ChainIDStrPolygon ||
		chainID == ChainIDStrEthereum ||
		chainID == ChainIDStrKatana ||
		chainID == ChainIDStrSei ||
		chainID == ChainIDStrArbitrum ||
		chainID == ChainIDStrScroll ||
		chainID == ChainIDStrUnichain
}

func IsSolanaChainID(chainID string) bool {
	return chainID == ChainIDStrSolana
}
