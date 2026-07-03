package app

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/o-mid/engagepulse/internal/config"
)

type App struct {
	cfg    config.Config
	logger *slog.Logger
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
