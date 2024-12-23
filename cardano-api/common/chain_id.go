package common

type chainIDNum = uint8

const (
	ChainTypeCardano = iota
	ChainTypeEVM

	ChainIDStrPrime   = "prime"
	ChainIDStrVector  = "vector"
	ChainIDStrNexus   = "nexus"
	ChainIDStrCardano = "cardano"

	ChainIDIntPrime   = chainIDNum(1)
	ChainIDIntVector  = chainIDNum(2)
	ChainIDIntNexus   = chainIDNum(3)
	ChainIDIntCardano = chainIDNum(4)
)

var (
	strToInt = map[string]chainIDNum{
		ChainIDStrPrime:   ChainIDIntPrime,
		ChainIDStrVector:  ChainIDIntVector,
		ChainIDStrNexus:   ChainIDIntNexus,
		ChainIDStrCardano: ChainIDIntCardano,
	}
	intToStr = map[chainIDNum]string{
		ChainIDIntPrime:   ChainIDStrPrime,
		ChainIDIntVector:  ChainIDStrVector,
		ChainIDIntNexus:   ChainIDStrNexus,
		ChainIDIntCardano: ChainIDStrCardano,
	}
)

func ToNumChainID(chainIDStr string) chainIDNum {
	return strToInt[chainIDStr]
}

func ToStrChainID(chainIDNum chainIDNum) string {
	return intToStr[chainIDNum]
}
