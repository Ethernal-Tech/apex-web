package clicardanoapi

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/Ethernal-Tech/cardano-api/api"
	"github.com/Ethernal-Tech/cardano-api/api/controllers"
	"github.com/Ethernal-Tech/cardano-api/common"
	"github.com/Ethernal-Tech/cardano-api/core"
	validatorchange "github.com/Ethernal-Tech/cardano-api/validator-change"
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

	logger, err := loggerInfra.NewLogger(config.Settings.Logger)
	if err != nil {
		outputter.SetError(err)

		return
	}

	ctx, cancelCtx := context.WithCancel(context.Background())
	defer cancelCtx()

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

	apiControllers := []core.APIController{}

	switch config.RunMode {
	case common.ReactorMode:
		validatorChangeTracker := core.NewValidatorChangeTracker()

		apiControllers = append(
			apiControllers,
			controllers.NewReactorTxController(config, logger.Named("reactor_tx_controller"), validatorChangeTracker),
		)

		validatorChange := validatorchange.NewValidatorChange(ctx, logger, config, validatorChangeTracker)

		go validatorChange.Start(ctx)
	case common.SkylineMode:
		apiControllers = append(
			apiControllers, controllers.NewSkylineTxController(config, logger.Named("skyline_tx_controller")),
		)
	default:
		logger.Error("cardano api creation failed", "err", "run mode is invalid.")
		outputter.SetError(errors.New("run mode is invalid"))

		return
	}

	apiObj, err := api.NewAPI(config.APIConfig, apiControllers, logger.Named("api"))
	if err != nil {
		logger.Error("cardano api creation failed", "err", err)
		outputter.SetError(err)

		return
	}

	go apiObj.Start(ctx)

	_, _ = outputter.Write([]byte("Server has been started...\n"))

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
