package clicardanoapi

import "github.com/spf13/cobra"

const (
	configFlag = "config"

	configFlagDesc = "path to config json file"
)

type cardanoAPIParams struct {
	config string
}

func (ip *cardanoAPIParams) validateFlags() error {
	return nil
}

func (ip *cardanoAPIParams) setFlags(cmd *cobra.Command) {
	cmd.Flags().StringVar(
		&ip.config,
		configFlag,
		"",
		configFlagDesc,
	)
}
