package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/o-mid/engagepulse/internal/domain"
	kafkago "github.com/segmentio/kafka-go"
)

// DeadLetter is what ops would inspect later: original event + why processing gave up.
type DeadLetter struct {
	Event    domain.Event `json:"event"`
	Error    string       `json:"error"`
	Attempts int          `json:"attempts"`
	FailedAt time.Time    `json:"failed_at"`
}

type DLQPublisher interface {
	PublishDLQ(ctx context.Context, evt domain.Event, reason string, attempts int) error
}

// PublishDLQ writes to this producer's topic (wired as player.events.dlq in app setup).
func (p *Producer) PublishDLQ(ctx context.Context, evt domain.Event, reason string, attempts int) error {
	body, err := json.Marshal(DeadLetter{
		Event:    evt,
		Error:    reason,
		Attempts: attempts,
		FailedAt: time.Now().UTC(),
	})
	if err != nil {
		return fmt.Errorf("marshal dlq: %w", err)
	}
	msg := kafkago.Message{
		Key:   []byte(evt.TenantID + ":" + evt.EventID),
		Value: body,
		Time:  time.Now().UTC(),
	}
	if err := p.writer.WriteMessages(ctx, msg); err != nil {
		return fmt.Errorf("write dlq message: %w", err)
	}
	return nil
}
