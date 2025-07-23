package main

import (
	"fmt"

	"github.com/Ethernal-Tech/cardano-api/cli"
)

func main() {
	fmt.Println("Server started.")
	cli.NewRootCommand().Execute()
}
