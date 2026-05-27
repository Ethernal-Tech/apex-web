package solanatx

import (
	"encoding/json"
	"fmt"

	solanawallet "github.com/Ethernal-Tech/solana-infrastructure/wallet"
)

type SolanaChainConfig struct {
	JSONRPCAddress string `json:"jsonRpcAddress"`
	ProgramID      string `json:"programID"`
}

func NewSolanaChainConfig(rawMessage json.RawMessage) (*SolanaChainConfig, error) {
	var solanaChainConfig SolanaChainConfig
	if err := json.Unmarshal(rawMessage, &solanaChainConfig); err != nil {
		return nil, fmt.Errorf("failed to unmarshal Solana configuration: %w", err)
	}

	return &solanaChainConfig, nil
}

func (config SolanaChainConfig) Serialize() ([]byte, error) {
	return json.Marshal(config)
}

func (config SolanaChainConfig) CreateTxProvider() (*solanawallet.Provider, error) {
	return solanawallet.NewProvider(config.JSONRPCAddress)
}
