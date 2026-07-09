package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/o-mid/engagepulse/internal/domain"
	kafkago "github.com/segmentio/kafka-go"
)

type EventHandler func(ctx context.Context, evt domain.Event) error

type Consumer struct {
	reader  *kafkago.Reader
	logger  *slog.Logger
	handler EventHandler
}

func NewConsumer(brokers []string, topic, group string, logger *slog.Logger, handler EventHandler) *Consumer {
	return &Consumer{
		logger:  logger,
		handler: handler,
		reader: kafkago.NewReader(kafkago.ReaderConfig{
			Brokers:        brokers,
			Topic:          topic,
			GroupID:        group,
			MinBytes:       1,
			MaxBytes:       10e6,
			CommitInterval: time.Second,
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
			_ = c.reader.CommitMessages(ctx, msg)
			continue
		}

		if err := c.handler(ctx, evt); err != nil {
			c.logger.Error("handle event", "event_id", evt.EventID, "err", err)
			continue
		}

		if err := c.reader.CommitMessages(ctx, msg); err != nil {
			return fmt.Errorf("commit message: %w", err)
		}
	}
}

func (c *Consumer) Close() error {
	if c == nil || c.reader == nil {
		return nil
	}
	return c.reader.Close()
}
