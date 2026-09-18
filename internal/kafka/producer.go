package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/o-mid/engagepulse/internal/domain"
	kafkago "github.com/segmentio/kafka-go"
)

type Producer struct {
	writer *kafkago.Writer
	topic  string
}

func NewProducer(brokers []string, topic string) *Producer {
	return &Producer{
		topic: topic,
		writer: &kafkago.Writer{
			Addr:                   kafkago.TCP(brokers...),
			Topic:                  topic,
			Balancer:               &kafkago.Hash{},
			RequiredAcks:           kafkago.RequireOne,
			Async:                  false,
			AllowAutoTopicCreation: true,
			WriteTimeout:           10 * time.Second,
		},
	}
}

func (p *Producer) Publish(ctx context.Context, evt domain.Event) error {
	payload, err := json.Marshal(evt)
	if err != nil {
		return fmt.Errorf("marshal event: %w", err)
	}
	msg := kafkago.Message{
		Key:   []byte(evt.TenantID + ":" + evt.PlayerID),
		Value: payload,
		Time:  time.Now().UTC(),
	}
	if err := p.writer.WriteMessages(ctx, msg); err != nil {
		return fmt.Errorf("write kafka message: %w", err)
	}
	return nil
}

func (p *Producer) Close() error {
	if p == nil || p.writer == nil {
		return nil
	}
	return p.writer.Close()
}

// Ping dials a broker for /readyz.
func Ping(ctx context.Context, brokers []string) error {
	if len(brokers) == 0 {
		return fmt.Errorf("no kafka brokers")
	}
	d := &kafkago.Dialer{Timeout: 2 * time.Second}
	var last error
	for _, broker := range brokers {
		conn, err := d.DialContext(ctx, "tcp", broker)
		if err != nil {
			last = err
			continue
		}
		_ = conn.Close()
		return nil
	}
	if last == nil {
		return fmt.Errorf("kafka dial failed")
	}
	return fmt.Errorf("kafka dial: %w", last)
}
