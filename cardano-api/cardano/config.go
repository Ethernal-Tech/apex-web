package cardanotx

import (
	"encoding/json"
	"errors"
	"fmt"

	"github.com/Ethernal-Tech/cardano-infrastructure/sendtx"
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
	NativeTokens     []sendtx.TokenExchangeConfig     `json:"nativeTokens"`
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

func (config CardanoChainConfig) GetNativeToken(dstChainID string) (token cardanowallet.Token, err error) {
	tokenName := config.GetNativeTokenName(dstChainID)
	if tokenName == "" {
		return token, fmt.Errorf("no native token specified for destination: %s", dstChainID)
	}

	token, err = GetNativeTokenFromName(tokenName)
	if err == nil {
		return token, nil
	}

	return token, fmt.Errorf("chainID: %s, err: %w", dstChainID, err)
}

func (config CardanoChainConfig) GetNativeTokenName(dstChainID string) string {
	for _, dst := range config.NativeTokens {
		if dst.DstChainID != dstChainID {
			continue
		}

		return dst.TokenName
	}

	return ""
}

func GetNativeTokenFromConfig(tokenConfig sendtx.TokenExchangeConfig) (token cardanowallet.Token, err error) {
	token, err = GetNativeTokenFromName(tokenConfig.TokenName)
	if err == nil {
		return token, nil
	}

	return token, fmt.Errorf("chainID: %s, err: %w", tokenConfig.DstChainID, err)
}

func GetNativeTokenFromName(tokenName string) (token cardanowallet.Token, err error) {
	return cardanowallet.NewTokenWithFullNameTry(tokenName)
}
