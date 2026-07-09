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
	"github.com/o-mid/engagepulse/internal/worker"
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

	pub := kafka.NewProducer(a.cfg.KafkaBrokers, a.cfg.KafkaTopic)
	defer func() { _ = pub.Close() }()

	w := worker.New(a.store, a.logger)
	consumer := kafka.NewConsumer(a.cfg.KafkaBrokers, a.cfg.KafkaTopic, "engagepulse-workers", a.logger, w.Handle)
	defer func() { _ = consumer.Close() }()

	api := httpapi.New(a.store, pub, a.logger)
	srv := &http.Server{
		Addr:              a.cfg.HTTPAddr,
		Handler:           api.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	errCh := make(chan error, 2)
	go func() {
		a.logger.Info("http listening", "addr", a.cfg.HTTPAddr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()
	go func() {
		if err := consumer.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
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
