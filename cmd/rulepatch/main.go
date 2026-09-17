package main

import (
	"context"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"os"

	"github.com/o-mid/engagepulse/internal/replay"
	"github.com/o-mid/engagepulse/internal/rulepatch"
	"github.com/o-mid/engagepulse/internal/rules"
	"github.com/o-mid/engagepulse/internal/store"
	"github.com/o-mid/engagepulse/internal/worker"
)

func main() {
	request := flag.String("request", "raise velocity threshold", "natural-language rule change")
	flag.Parse()

	if err := run(*request); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(request string) error {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	ctx := context.Background()
	st, err := store.Open(ctx, dsn)
	if err != nil {
		return err
	}
	defer st.Close()
	if err := st.Migrate(ctx); err != nil {
		return err
	}

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	before, err := replay.Run(ctx, st, worker.New(st, logger))
	if err != nil {
		return fmt.Errorf("replay before: %w", err)
	}

	proposer, err := rulepatch.NewFromEnv()
	if err != nil {
		return err
	}

	patch, err := proposer.Propose(ctx, request, rules.Defaults())
	if err != nil {
		return err
	}

	eng := rules.New()
	eng.T = patch.Thresholds
	after, err := replay.Run(ctx, st, worker.NewWithRules(st, logger, eng))
	if err != nil {
		return fmt.Errorf("replay after: %w", err)
	}

	fmt.Println("before")
	fmt.Print(replay.Format(before))
	fmt.Println("proposed diff (advisory; not applied)")
	fmt.Print(patch.Diff)
	fmt.Println("after")
	fmt.Print(replay.Format(after))

	if !after.AllPass() {
		return fmt.Errorf("replay failed after proposed patch; copy the diff by hand if you still want it")
	}
	return nil
}
