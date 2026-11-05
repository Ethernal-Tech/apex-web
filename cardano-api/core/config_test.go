package core

import (
	"testing"
	"time"

	"github.com/hashicorp/go-hclog"
	"github.com/stretchr/testify/require"
)

func TestGetChainConfig_ReleasesLocks(t *testing.T) {
	const prime = "prime"

	appConfig := &AppConfig{
		CardanoChains: map[string]*CardanoChainConfig{prime: {ChainID: prime, IsEnabled: true}},
		EthChains:     map[string]*EthChainConfig{"nexus": {ChainID: "nexus", IsEnabled: true}},
		SolanaChains:  map[string]*SolanaChainConfig{"solana": {ChainID: "solana", IsEnabled: true}},
	}

	cardanoCfg, _, _ := appConfig.GetChainConfig(prime)
	require.NotNil(t, cardanoCfg)

	_, ethCfg, _ := appConfig.GetChainConfig("nexus")
	require.NotNil(t, ethCfg)

	_, _, solanaCfg := appConfig.GetChainConfig("solana")
	require.NotNil(t, solanaCfg)

	cardanoCfg, ethCfg, solanaCfg = appConfig.GetChainConfig("unknown")
	require.Nil(t, cardanoCfg)
	require.Nil(t, ethCfg)
	require.Nil(t, solanaCfg)

	// a leaked read lock would block every writer forever
	done := make(chan struct{})

	go func() {
		defer close(done)

		appConfig.updateMultisigAddresses(hclog.NewNullLogger(), map[string]BridgingAddresses{
			prime: {BridgingAddress: "addr_bridging"},
		})

		// only checks that the evm and solana locks are free
		appConfig.evmChainsMu.Lock()
		appConfig.evmChainsMu.Unlock()

		appConfig.solanaChainsMu.Lock()
		appConfig.solanaChainsMu.Unlock()
	}()

	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("GetChainConfig left a chain config lock held")
	}

	require.Equal(t, "addr_bridging", appConfig.GetCardanoMultiSigAddress(prime))
}
