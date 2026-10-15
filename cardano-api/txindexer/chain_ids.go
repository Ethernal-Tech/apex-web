package txindexer

import (
	"fmt"

	"github.com/Ethernal-Tech/cardano-api/common"
)

// ChainIDsConfigFile has the same format as the chain IDs config used by apex-bridge
type ChainIDsConfigFile struct {
	ChainIDConfig []ChainIDConfig `json:"chainIDs"`
}

type ChainIDConfig struct {
	ChainID    string `json:"chainID"`
	ChainIDNum uint8  `json:"chainIDNum"`
	ChainType  string `json:"chainType,omitempty"`
}

// ChainIDConverter maps numeric chain IDs used by EVM gateway contracts to chain ID strings
type ChainIDConverter map[uint8]string

func LoadChainIDConverter(path string) (ChainIDConverter, error) {
	file, err := common.LoadJSON[ChainIDsConfigFile](path)
	if err != nil {
		return nil, fmt.Errorf("failed to load chain IDs config %s: %w", path, err)
	}

	converter := make(ChainIDConverter, len(file.ChainIDConfig))
	for _, cfg := range file.ChainIDConfig {
		converter[cfg.ChainIDNum] = cfg.ChainID
	}

	return converter, nil
}

func (c ChainIDConverter) ToChainIDStr(chainIDNum uint8) (string, error) {
	chainID, exists := c[chainIDNum]
	if !exists {
		return "", fmt.Errorf("unknown chain ID number: %d", chainIDNum)
	}

	return chainID, nil
}
