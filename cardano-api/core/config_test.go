package core

import (
	"sync"
	"testing"

	"github.com/stretchr/testify/require"
)

const (
	testPrimeChainID  = "prime"
	testVectorChainID = "vector"
	testNexusChainID  = "nexus"
	testSolanaChainID = "solana"
)

// requireChainLocksFree fails when any chain config lock is still held.
// TryLock fails immediately on a leaked read lock.
func requireChainLocksFree(t *testing.T, appConfig *AppConfig) {
	t.Helper()

	locks := map[string]*sync.RWMutex{
		"cardano": &appConfig.cardanoChainsMu,
		"evm":     &appConfig.evmChainsMu,
		"solana":  &appConfig.solanaChainsMu,
	}

	for name, mu := range locks {
		require.True(t, mu.TryLock(), "%s chains lock is still held", name)
		mu.Unlock()
	}
}

func TestGetChainConfig_ReleasesLocks(t *testing.T) {
	appConfig := &AppConfig{
		CardanoChains: map[string]*CardanoChainConfig{
			testPrimeChainID:  {ChainID: testPrimeChainID, IsEnabled: true},
			testVectorChainID: {ChainID: testVectorChainID, IsEnabled: false},
		},
		EthChains: map[string]*EthChainConfig{
			testNexusChainID: {ChainID: testNexusChainID, IsEnabled: true},
		},
		SolanaChains: map[string]*SolanaChainConfig{
			testSolanaChainID: {ChainID: testSolanaChainID, IsEnabled: true},
		},
	}

	cardanoCfg, _, _ := appConfig.GetChainConfig(testPrimeChainID)
	require.NotNil(t, cardanoCfg)
	requireChainLocksFree(t, appConfig)

	_, ethCfg, _ := appConfig.GetChainConfig(testNexusChainID)
	require.NotNil(t, ethCfg)
	requireChainLocksFree(t, appConfig)

	_, _, solanaCfg := appConfig.GetChainConfig(testSolanaChainID)
	require.NotNil(t, solanaCfg)
	requireChainLocksFree(t, appConfig)

	// a disabled chain and an unknown chain both return nothing
	for _, chainID := range []string{testVectorChainID, "unknown"} {
		cardanoCfg, ethCfg, solanaCfg = appConfig.GetChainConfig(chainID)
		require.Nil(t, cardanoCfg, chainID)
		require.Nil(t, ethCfg, chainID)
		require.Nil(t, solanaCfg, chainID)
		requireChainLocksFree(t, appConfig)
	}
}

func TestToSendTxChainConfigs_ReleasesLocksOnError(t *testing.T) {
	// an evm chain fails to convert because no run mode is set
	appConfig := &AppConfig{
		EthChains: map[string]*EthChainConfig{
			testNexusChainID: {ChainID: testNexusChainID, IsEnabled: true},
		},
	}

	_, err := appConfig.ToSendTxChainConfigs()
	require.ErrorContains(t, err, "run mode not supported")
	requireChainLocksFree(t, appConfig)
}
