package clicardanoapi

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Ethernal-Tech/cardano-api/api"
	"github.com/Ethernal-Tech/cardano-api/api/controllers"
	"github.com/Ethernal-Tech/cardano-api/common"
	"github.com/Ethernal-Tech/cardano-api/core"
	"github.com/Ethernal-Tech/cardano-api/telemetry"
	"github.com/Ethernal-Tech/cardano-api/txindexer"
	validatorchange "github.com/Ethernal-Tech/cardano-api/validator-change"
	loggerInfra "github.com/Ethernal-Tech/cardano-infrastructure/logger"
	"github.com/spf13/cobra"
)

const telemetryCloseTimeout = 5 * time.Second

var caParams = &cardanoAPIParams{}

func GetCardanoAPICommand() *cobra.Command {
	secretsInitCmd := &cobra.Command{
		Use:     "run-cardano-api",
		Short:   "runs cardano api",
		PreRunE: runPreRun,
		Run:     runCommand,
	}

	caParams.setFlags(secretsInitCmd)

	return secretsInitCmd
}

func runPreRun(_ *cobra.Command, _ []string) error {
	return caParams.validateFlags()
}

func runCommand(cmd *cobra.Command, _ []string) {
	outputter := common.InitializeOutputter(cmd)
	defer outputter.WriteOutput()

	config, err := common.LoadConfig[core.AppConfig](caParams.config, "")
	if err != nil {
		outputter.SetError(err)

		return
	}

	logger, err := loggerInfra.NewLogger(config.Settings.Logger)
	if err != nil {
		outputter.SetError(err)

		return
	}

	ctx, cancelCtx := context.WithCancel(context.Background())
	defer cancelCtx()

	validatorChangeTracker := core.NewValidatorChangeTracker()

	err = config.FillOut(ctx, logger)
	if err != nil {
		outputter.SetError(err)

		return
	}

	defer func() {
		if r := recover(); r != nil {
			logger.Error("PANIC", "err", r)
			outputter.SetError(fmt.Errorf("%v", r))
		}
	}()

	apiControllers := []core.APIController{
		controllers.NewCardanoTxController(
			config, logger.Named("cardano_tx_controller"),
			validatorChangeTracker),
	}

	if config.Telemetry.IsEnabled() {
		telemetryObj := telemetry.NewTelemetry(config.Telemetry, logger.Named("telemetry"))

		if err := telemetryObj.Start(); err != nil {
			logger.Error("telemetry start failed", "err", err)
			outputter.SetError(err)

			return
		}

		defer func() {
			closeCtx, cancelCloseCtx := context.WithTimeout(context.Background(), telemetryCloseTimeout)
			defer cancelCloseCtx()

			if err := telemetryObj.Close(closeCtx); err != nil {
				logger.Error("error while telemetry dispose", "err", err)
			}
		}()
	}

	if config.Indexer != nil {
		indexerManager, err := txindexer.NewManager(config, logger.Named("indexer"))
		if err != nil {
			logger.Error("indexer creation failed", "err", err)
			outputter.SetError(err)

			return
		}

		indexerCtx, cancelIndexerCtx := context.WithCancel(ctx)

		indexerManager.Start(indexerCtx)

		defer func() {
			cancelIndexerCtx()

			if err := indexerManager.Close(); err != nil {
				logger.Error("error while indexer dispose", "err", err)
			}
		}()

		apiControllers = append(apiControllers, controllers.NewBridgingTxController(
			indexerManager.Store(), config.Indexer.PullLimit, logger.Named("bridging_tx_controller")))
	}

	apiObj, err := api.NewAPI(config.APIConfig, apiControllers, logger.Named("api"))
	if err != nil {
		logger.Error("cardano api creation failed", "err", err)
		outputter.SetError(err)

		return
	}

	validatorChange := validatorchange.NewValidatorChange(ctx, logger, config, validatorChangeTracker)

	go apiObj.Start(ctx)

	go validatorChange.Start(ctx)

	defer func() {
		err := apiObj.Dispose()
		if err != nil {
			logger.Error("error while api dispose", "err", err)
		}
	}()

	signalChannel := make(chan os.Signal, 1)
	// Notify the signalChannel when the interrupt signal is received (Ctrl+C)
	signal.Notify(signalChannel, os.Interrupt, syscall.SIGTERM)

	<-signalChannel

	outputter.SetCommandResult(&CmdResult{})
}
