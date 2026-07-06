package app

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/o-mid/engagepulse/internal/config"
	"github.com/o-mid/engagepulse/internal/store"
)

type App struct {
	cfg    config.Config
	logger *slog.Logger
	store  *store.Store
}

func New(cfg config.Config) *App {
	level := slog.LevelInfo
	switch cfg.LogLevel {
	case "debug":
		level = slog.LevelDebug
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level}))
	return &App{cfg: cfg, logger: logger}
}

func (a *App) Run(ctx context.Context) error {
	st, err := store.Open(ctx, a.cfg.DatabaseURL)
	if err != nil {
		return err
	}
	a.store = st
	defer a.store.Close()

	if err := a.store.Migrate(ctx); err != nil {
		return fmt.Errorf("migrate: %w", err)
	}

	a.logger.Info("engagepulse ready",
		"http_addr", a.cfg.HTTPAddr,
		"grpc_addr", a.cfg.GRPCAddr,
		"kafka_topic", a.cfg.KafkaTopic,
	)
	<-ctx.Done()
	return fmt.Errorf("shutdown: %w", ctx.Err())
}

func (a *App) Logger() *slog.Logger {
	return a.logger
}

func (a *App) Store() *store.Store {
	return a.store
}
