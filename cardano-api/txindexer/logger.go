package txindexer

import (
	"fmt"
	"path/filepath"
	"strings"

	loggerInfra "github.com/Ethernal-Tech/cardano-infrastructure/logger"
	"github.com/hashicorp/go-hclog"
)

// newChainLogger creates a logger which writes the output of the block syncer or event tracker of a
// single chain into its own <chainID>-indexer.log file, placed next to the main log file (same as in
// apex-bridge). That way the noisy indexer output does not end up in the main log file.
func newChainLogger(
	baseConfig loggerInfra.LoggerConfig, logLevel *hclog.Level, chainID string, mainLogger hclog.Logger,
) (hclog.Logger, error) {
	logFilePath := strings.TrimSpace(baseConfig.LogFilePath)
	if logFilePath == "" {
		return mainLogger, nil
	}

	chainLoggerConfig := baseConfig
	chainLoggerConfig.LogFilePath = filepath.Join(filepath.Dir(logFilePath), fmt.Sprintf("%s-indexer.log", chainID))

	if logLevel != nil {
		chainLoggerConfig.LogLevel = *logLevel
	}

	chainLogger, err := loggerInfra.NewLogger(chainLoggerConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create indexer logger for `%s`: %w", chainID, err)
	}

	return chainLogger, nil
}
