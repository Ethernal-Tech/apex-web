package clicardanoapi

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/Ethernal-Tech/cardano-api/api"
	"github.com/Ethernal-Tech/cardano-api/api/controllers"
	"github.com/Ethernal-Tech/cardano-api/common"
	"github.com/Ethernal-Tech/cardano-api/core"
	loggerInfra "github.com/Ethernal-Tech/cardano-infrastructure/logger"
	"github.com/spf13/cobra"
)

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

	config.FillOut()

	logger, err := loggerInfra.NewLogger(config.Settings.Logger)
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

	ctx, cancelCtx := context.WithCancel(context.Background())
	defer cancelCtx()

	apiControllers := []core.APIController{
		controllers.NewCardanoTxController(
			config, logger.Named("cardano_tx_controller")),
	}

	apiObj, err := api.NewAPI(ctx, config.APIConfig, apiControllers, logger.Named("api"))
	if err != nil {
		logger.Error("cardano api creation failed", "err", err)
		outputter.SetError(err)

		return
	}

	go apiObj.Start()

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
