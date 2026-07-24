package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/metrics"
	kafkago "github.com/segmentio/kafka-go"
)

type EventHandler func(ctx context.Context, evt domain.Event) error

const (
	defaultMaxAttempts = 3
	defaultBackoff     = 50 * time.Millisecond
)

type Consumer struct {
	reader      *kafkago.Reader
	logger      *slog.Logger
	handler     EventHandler
	dlq         DLQPublisher
	maxAttempts int
	backoff     time.Duration
}

func NewConsumer(brokers []string, topic, group string, logger *slog.Logger, handler EventHandler, dlq DLQPublisher) *Consumer {
	return &Consumer{
		logger:      logger,
		handler:     handler,
		dlq:         dlq,
		maxAttempts: defaultMaxAttempts,
		backoff:     defaultBackoff,
		reader: kafkago.NewReader(kafkago.ReaderConfig{
			Brokers:        brokers,
			Topic:          topic,
			GroupID:        group,
			MinBytes:       1,
			MaxBytes:       10e6,
			CommitInterval: 0,
			StartOffset:    kafkago.FirstOffset,
		}),
	}
}

func (c *Consumer) Run(ctx context.Context) error {
	c.logger.Info("kafka consumer started")
	for {
		msg, err := c.reader.FetchMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return ctx.Err()
			}
			return fmt.Errorf("fetch message: %w", err)
		}

		var evt domain.Event
		if err := json.Unmarshal(msg.Value, &evt); err != nil {
			c.logger.Error("unmarshal event", "err", err)
			// Unreadable payloads will never succeed — park a stub in the DLQ and move on.
			if c.dlq != nil {
				_ = c.dlq.PublishDLQ(ctx, domain.Event{EventID: "unmarshal"}, err.Error(), 1)
			}
			if err := c.reader.CommitMessages(ctx, msg); err != nil {
				return fmt.Errorf("commit poison message: %w", err)
			}
			continue
		}

		if err := c.processEvent(ctx, evt); err != nil {
			c.logger.Error("process event", "event_id", evt.EventID, "err", err)
			// DLQ publish failed: keep the offset uncommitted so Kafka can redeliver.
			continue
		}

		if err := c.reader.CommitMessages(ctx, msg); err != nil {
			return fmt.Errorf("commit message: %w", err)
		}
	}
}

// processEvent returns nil only when the offset is safe to commit:
// handler succeeded, or retries exhausted and the DLQ write succeeded.
func (c *Consumer) processEvent(ctx context.Context, evt domain.Event) error {
	var lastErr error
	attempts := c.maxAttempts
	if attempts < 1 {
		attempts = 1
	}
	for attempt := 1; attempt <= attempts; attempt++ {
		err := c.handler(ctx, evt)
		if err == nil {
			return nil
		}
		lastErr = err
		c.logger.Error("handle event", "event_id", evt.EventID, "attempt", attempt, "err", err)
		if attempt < attempts {
			metrics.ConsumerRetries.Inc()
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(c.backoff * time.Duration(attempt)):
			}
		}
	}

	if c.dlq == nil {
		return fmt.Errorf("handler failed and no dlq configured: %w", lastErr)
	}
	if err := c.dlq.PublishDLQ(ctx, evt, lastErr.Error(), attempts); err != nil {
		return fmt.Errorf("publish dlq: %w", err)
	}
	metrics.ConsumerDLQ.Inc()
	c.logger.Info("routed event to dlq", "event_id", evt.EventID, "attempts", attempts)
	return nil
}

func (c *Consumer) Close() error {
	if c == nil || c.reader == nil {
		return nil
	}
	return c.reader.Close()
}
