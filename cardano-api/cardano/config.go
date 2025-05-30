package cardanotx

import (
	"encoding/json"
	"errors"
	"fmt"

	"github.com/Ethernal-Tech/cardano-api/common"
	cardanowallet "github.com/Ethernal-Tech/cardano-infrastructure/wallet"
)

type CardanoChainConfig struct {
	NetworkID        cardanowallet.CardanoNetworkType `json:"-"`
	NetworkMagic     uint32                           `json:"-"`
	OgmiosURL        string                           `json:"ogmiosUrl,omitempty"`
	BlockfrostURL    string                           `json:"blockfrostUrl,omitempty"`
	BlockfrostAPIKey string                           `json:"blockfrostApiKey,omitempty"`
	UseDemeter       bool                             `json:"useDemeter,omitempty"`
	SocketPath       string                           `json:"socketPath,omitempty"`
	PotentialFee     uint64                           `json:"potentialFee"`
	TTLSlotNumberInc uint64                           `json:"ttlSlotNumberIncrement"`
}

var _ common.ChainSpecificConfig = (*CardanoChainConfig)(nil)

// GetChainType implements ChainSpecificConfig.
func (*CardanoChainConfig) GetChainType() string {
	return "Cardano"
}

func NewCardanoChainConfig(rawMessage json.RawMessage) (*CardanoChainConfig, error) {
	var cardanoChainConfig CardanoChainConfig
	if err := json.Unmarshal(rawMessage, &cardanoChainConfig); err != nil {
		return nil, fmt.Errorf("failed to unmarshal Cardano configuration: %w", err)
	}

	return &cardanoChainConfig, nil
}

func (config CardanoChainConfig) Serialize() ([]byte, error) {
	return json.Marshal(config)
}

func (config CardanoChainConfig) CreateTxProvider() (cardanowallet.ITxProvider, error) {
	if config.OgmiosURL != "" {
		return cardanowallet.NewTxProviderOgmios(config.OgmiosURL), nil
	}

	if config.SocketPath != "" {
		return cardanowallet.NewTxProviderCli(
			uint(config.NetworkMagic), config.SocketPath, cardanowallet.ResolveCardanoCliBinary(config.NetworkID))
	}

	if config.BlockfrostURL != "" {
		if config.UseDemeter {
			return cardanowallet.NewTxProviderDemeter(config.BlockfrostURL, config.BlockfrostAPIKey, "", ""), nil
		}

		return cardanowallet.NewTxProviderBlockFrost(config.BlockfrostURL, config.BlockfrostAPIKey), nil
	}

	return nil, errors.New("neither a blockfrost nor a ogmios nor a socket path is specified")
}
