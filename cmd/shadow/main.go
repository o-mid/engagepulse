package main

import (
	"context"
	"fmt"
	"os"

	"github.com/o-mid/engagepulse/internal/shadow"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	s, err := shadow.NewFromEnv()
	if err != nil {
		return err
	}
	board, err := shadow.Compare(context.Background(), s)
	if err != nil {
		return err
	}
	fmt.Print(shadow.Format(board))
	return nil
}
