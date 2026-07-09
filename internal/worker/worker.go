package worker

import (
	"context"
	"errors"
	"log/slog"

	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/store"
)

type Worker struct {
	store  *store.Store
	logger *slog.Logger
}

func New(st *store.Store, logger *slog.Logger) *Worker {
	return &Worker{store: st, logger: logger}
}

func (w *Worker) Handle(ctx context.Context, evt domain.Event) error {
	if err := w.store.EnsurePlayer(ctx, evt.TenantID, evt.PlayerID); err != nil {
		return err
	}

	err := w.store.MarkProcessed(ctx, evt.TenantID, evt.EventID, evt.Type)
	if errors.Is(err, store.ErrDuplicateEvent) {
		w.logger.Info("skip duplicate event", "event_id", evt.EventID, "tenant_id", evt.TenantID)
		return nil
	}
	if err != nil {
		return err
	}

	w.logger.Info("event processed",
		"event_id", evt.EventID,
		"tenant_id", evt.TenantID,
		"player_id", evt.PlayerID,
		"type", evt.Type,
	)
	return nil
}
