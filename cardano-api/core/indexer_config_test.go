package core

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/json"
	"encoding/pem"
	"math/big"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/Ethernal-Tech/cardano-infrastructure/indexer/gouroboros"
	"github.com/stretchr/testify/require"
)

// writeTestTLSFiles writes a private CA and a client cert/key signed by it into dir
func writeTestTLSFiles(t *testing.T, dir string) *gouroboros.TLSConfig {
	t.Helper()

	caKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)

	caTemplate := &x509.Certificate{
		SerialNumber:          big.NewInt(1),
		Subject:               pkix.Name{CommonName: "test-ca"},
		NotBefore:             time.Now().UTC().Add(-time.Hour),
		NotAfter:              time.Now().UTC().Add(time.Hour),
		IsCA:                  true,
		BasicConstraintsValid: true,
		KeyUsage:              x509.KeyUsageCertSign,
	}
	caDER, err := x509.CreateCertificate(rand.Reader, caTemplate, caTemplate, &caKey.PublicKey, caKey)
	require.NoError(t, err)

	clientKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)

	clientTemplate := &x509.Certificate{
		SerialNumber: big.NewInt(2),
		Subject:      pkix.Name{CommonName: "cardano-api"},
		NotBefore:    time.Now().UTC().Add(-time.Hour),
		NotAfter:     time.Now().UTC().Add(time.Hour),
		KeyUsage:     x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
	}
	clientDER, err := x509.CreateCertificate(rand.Reader, clientTemplate, caTemplate, &clientKey.PublicKey, caKey)
	require.NoError(t, err)

	clientKeyDER, err := x509.MarshalPKCS8PrivateKey(clientKey)
	require.NoError(t, err)

	write := func(name, blockType string, der []byte) string {
		path := filepath.Join(dir, name)
		require.NoError(t, os.WriteFile(path, pem.EncodeToMemory(&pem.Block{Type: blockType, Bytes: der}), 0o600))

		return path
	}

	return &gouroboros.TLSConfig{
		CAFile:   write("ca.pem", "CERTIFICATE", caDER),
		CertFile: write("client.pem", "CERTIFICATE", clientDER),
		KeyFile:  write("client.key", "PRIVATE KEY", clientKeyDER),
	}
}

func newIndexerTestAppConfig(chainCfg *CardanoIndexerConfig) *AppConfig {
	return &AppConfig{
		CardanoChains: map[string]*CardanoChainConfig{"prime": {}},
		Indexer: &IndexerConfig{
			DbsPath:       "./dbs",
			CardanoChains: map[string]*CardanoIndexerConfig{"prime": chainCfg},
		},
	}
}

func TestFillOutIndexer_CardanoTLS(t *testing.T) {
	t.Run("no tls keeps plain connection", func(t *testing.T) {
		cfg := newIndexerTestAppConfig(&CardanoIndexerConfig{NetworkAddress: "relay.example:3001"})

		require.NoError(t, cfg.fillOutIndexer())
		require.Nil(t, cfg.Indexer.CardanoChains["prime"].NetworkTLS)
	})

	t.Run("valid tls", func(t *testing.T) {
		tlsCfg := writeTestTLSFiles(t, t.TempDir())
		cfg := newIndexerTestAppConfig(&CardanoIndexerConfig{NetworkAddress: "relay.example:3001", NetworkTLS: tlsCfg})

		require.NoError(t, cfg.fillOutIndexer())
		require.Equal(t, tlsCfg, cfg.Indexer.CardanoChains["prime"].NetworkTLS)
	})

	t.Run("valid tls with explicit server name", func(t *testing.T) {
		tlsCfg := writeTestTLSFiles(t, t.TempDir())
		tlsCfg.ServerName = "node.internal"
		cfg := newIndexerTestAppConfig(&CardanoIndexerConfig{NetworkAddress: "10.0.0.5:3001", NetworkTLS: tlsCfg})

		require.NoError(t, cfg.fillOutIndexer())
	})

	t.Run("tls with unix socket", func(t *testing.T) {
		tlsCfg := writeTestTLSFiles(t, t.TempDir())
		cfg := newIndexerTestAppConfig(&CardanoIndexerConfig{NetworkAddress: "/ipc/node.socket", NetworkTLS: tlsCfg})

		require.ErrorContains(t, cfg.fillOutIndexer(), "unix socket")
	})

	t.Run("tls without port and without server name", func(t *testing.T) {
		tlsCfg := writeTestTLSFiles(t, t.TempDir())
		cfg := newIndexerTestAppConfig(&CardanoIndexerConfig{NetworkAddress: "relay.example", NetworkTLS: tlsCfg})

		require.ErrorContains(t, cfg.fillOutIndexer(), "no host:port to take the tls server name from")
	})

	t.Run("tls with explicit server name does not parse the address", func(t *testing.T) {
		tlsCfg := writeTestTLSFiles(t, t.TempDir())
		tlsCfg.ServerName = "node.internal"
		cfg := newIndexerTestAppConfig(&CardanoIndexerConfig{NetworkAddress: "relay.example", NetworkTLS: tlsCfg})

		require.NoError(t, cfg.fillOutIndexer())
	})

	t.Run("tls with empty host", func(t *testing.T) {
		tlsCfg := writeTestTLSFiles(t, t.TempDir())
		cfg := newIndexerTestAppConfig(&CardanoIndexerConfig{NetworkAddress: ":3001", NetworkTLS: tlsCfg})

		require.ErrorContains(t, cfg.fillOutIndexer(), "empty host")
	})

	t.Run("tls with https prefix uses trimmed address", func(t *testing.T) {
		tlsCfg := writeTestTLSFiles(t, t.TempDir())
		cfg := newIndexerTestAppConfig(&CardanoIndexerConfig{
			NetworkAddress: "https://relay.example:3001", NetworkTLS: tlsCfg,
		})

		require.NoError(t, cfg.fillOutIndexer())
		require.Equal(t, "relay.example:3001", cfg.Indexer.CardanoChains["prime"].NetworkAddress)
	})

	t.Run("tls with missing key file", func(t *testing.T) {
		tlsCfg := writeTestTLSFiles(t, t.TempDir())
		tlsCfg.KeyFile = filepath.Join(t.TempDir(), "missing.key")
		cfg := newIndexerTestAppConfig(&CardanoIndexerConfig{NetworkAddress: "relay.example:3001", NetworkTLS: tlsCfg})

		require.ErrorContains(t, cfg.fillOutIndexer(), "tls keyFile")
	})

	t.Run("tls with empty ca file path", func(t *testing.T) {
		tlsCfg := writeTestTLSFiles(t, t.TempDir())
		tlsCfg.CAFile = ""
		cfg := newIndexerTestAppConfig(&CardanoIndexerConfig{NetworkAddress: "relay.example:3001", NetworkTLS: tlsCfg})

		require.ErrorContains(t, cfg.fillOutIndexer(), "tls caFile is empty")
	})

	t.Run("networkTls is read from json", func(t *testing.T) {
		var chainCfg CardanoIndexerConfig

		require.NoError(t, json.Unmarshal([]byte(`{
			"networkAddress": "relay.example:3001",
			"networkTls": {"caFile": "/c/ca.pem", "certFile": "/c/client.pem", "keyFile": "/c/client.key", "serverName": "node"}
		}`), &chainCfg))
		require.Equal(t, &gouroboros.TLSConfig{
			CAFile: "/c/ca.pem", CertFile: "/c/client.pem", KeyFile: "/c/client.key", ServerName: "node",
		}, chainCfg.NetworkTLS)
	})

	t.Run("empty networkTls object fails at startup", func(t *testing.T) {
		cfg := newIndexerTestAppConfig(&CardanoIndexerConfig{})

		require.NoError(t, json.Unmarshal([]byte(`{"networkAddress": "relay.example:3001", "networkTls": {}}`),
			cfg.Indexer.CardanoChains["prime"]))
		require.ErrorContains(t, cfg.fillOutIndexer(), "invalid networkTls for chain prime")
	})
}
