package cligenerateconfigs

import (
	"bytes"
	"fmt"

	"github.com/Ethernal-Tech/cardano-api/common"
)

type CmdResult struct {
	configPath string
}

func (r CmdResult) GetOutput() string {
	var buffer bytes.Buffer

	buffer.WriteString(common.FormatKV(
		[]string{
			fmt.Sprintf("Config|%s", r.configPath),
		}))

	return buffer.String()
}
