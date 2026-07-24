package outbox

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/store"
)

type EventPublisher interface {
	Publish(ctx context.Context, evt domain.Event) error
}

type Publisher struct {
	store    *store.Store
	kafka    EventPublisher
	logger   *slog.Logger
	interval time.Duration
	batch    int
}

func NewPublisher(st *store.Store, kafka EventPublisher, logger *slog.Logger) *Publisher {
	if logger == nil {
		logger = slog.Default()
	}
	return &Publisher{
		store:    st,
		kafka:    kafka,
		logger:   logger,
		interval: 500 * time.Millisecond,
		batch:    50,
	}
}

func (p *Publisher) Run(ctx context.Context) error {
	p.logger.Info("outbox publisher started")
	ticker := time.NewTicker(p.interval)
	defer ticker.Stop()

	for {
		if err := p.flush(ctx); err != nil && ctx.Err() == nil {
			p.logger.Error("outbox flush", "err", err)
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
		}
	}
}

func (p *Publisher) FlushOnce(ctx context.Context) error {
	return p.flush(ctx)
}

func (p *Publisher) flush(ctx context.Context) error {
	if err := p.store.ReclaimPublishingOutbox(ctx); err != nil {
		return err
	}
	rows, err := p.store.ClaimPendingOutbox(ctx, p.batch)
	if err != nil {
		return err
	}
	for _, row := range rows {
		var evt domain.Event
		if err := json.Unmarshal(row.Payload, &evt); err != nil {
			_ = p.store.MarkOutboxPublishFailed(ctx, row.ID, err)
			p.logger.Error("outbox unmarshal", "id", row.ID, "err", err)
			continue
		}
		if err := p.kafka.Publish(ctx, evt); err != nil {
			_ = p.store.MarkOutboxPublishFailed(ctx, row.ID, err)
			p.logger.Error("outbox publish", "event_id", evt.EventID, "err", err)
			continue
		}
		if err := p.store.MarkOutboxPublished(ctx, row.ID); err != nil {
			return err
		}
	}
	return nil
}
