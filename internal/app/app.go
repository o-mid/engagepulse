package app

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/o-mid/engagepulse/internal/api/httpapi"
	"github.com/o-mid/engagepulse/internal/config"
	"github.com/o-mid/engagepulse/internal/kafka"
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

	pub := kafka.NewMemoryPublisher(1024)
	api := httpapi.New(a.store, pub, a.logger)
	srv := &http.Server{
		Addr:              a.cfg.HTTPAddr,
		Handler:           api.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		a.logger.Info("http listening", "addr", a.cfg.HTTPAddr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	a.logger.Info("engagepulse ready",
		"http_addr", a.cfg.HTTPAddr,
		"grpc_addr", a.cfg.GRPCAddr,
		"kafka_topic", a.cfg.KafkaTopic,
	)

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), a.cfg.ShutdownTTL)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
		return fmt.Errorf("shutdown: %w", ctx.Err())
	case err := <-errCh:
		return err
	}
}

func (a *App) Logger() *slog.Logger {
	return a.logger
}

func (a *App) Store() *store.Store {
	return a.store
}
