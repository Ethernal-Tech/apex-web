package cli

import (
	"fmt"
	"os"

	clicardanoapi "github.com/Ethernal-Tech/cardano-api/cli/cardano-api"
	cligenerateconfigs "github.com/Ethernal-Tech/cardano-api/cli/generateconfigs"

	"github.com/spf13/cobra"
)

type RootCommand struct {
	baseCmd *cobra.Command
}

func NewRootCommand() *RootCommand {
	rootCommand := &RootCommand{
		baseCmd: &cobra.Command{
			Short: "cli commands for apex bridge",
		},
	}

	rootCommand.registerSubCommands()

	return rootCommand
}

func (rc *RootCommand) registerSubCommands() {
	rc.baseCmd.AddCommand(
		cligenerateconfigs.GetGenerateConfigsCommand(),
		clicardanoapi.GetCardanoAPICommand(),
	)
}

func (rc *RootCommand) Execute() {
	if err := rc.baseCmd.Execute(); err != nil {
		_, _ = fmt.Fprintln(os.Stderr, err)

		os.Exit(1)
	}
}
