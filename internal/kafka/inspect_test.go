package kafka

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/o-mid/engagepulse/internal/domain"
)

func TestReadRecentReturnsLastNNewestFirst(t *testing.T) {
	brokers := os.Getenv("KAFKA_BROKERS")
	if brokers == "" {
		t.Skip("KAFKA_BROKERS required")
	}
	ctx := context.Background()
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	topic := "player.events.dlq.inspect-" + suffix
	if err := EnsureTopic([]string{brokers}, topic); err != nil {
		t.Fatalf("topic: %v", err)
	}

	pub := NewProducer([]string{brokers}, topic)
	for i := 1; i <= 3; i++ {
		evt := domain.Event{
			EventID:    fmt.Sprintf("inspect-%s-%d", suffix, i),
			TenantID:   "acme-casino",
			PlayerID:   "inspect-player",
			Type:       domain.EventDeposit,
			Amount:     50,
			OccurredAt: time.Now().UTC(),
		}
		if err := pub.PublishDLQ(ctx, evt, fmt.Sprintf("fail-%d", i), 3); err != nil {
			t.Fatalf("publish %d: %v", i, err)
		}
	}
	if err := pub.Close(); err != nil {
		t.Fatalf("close producer: %v", err)
	}

	readCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	got, err := ReadRecent(readCtx, []string{brokers}, topic, 2)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("len=%d want 2: %+v", len(got), got)
	}
	if got[0].Event.EventID != "inspect-"+suffix+"-3" {
		t.Fatalf("newest=%s want inspect-%s-3", got[0].Event.EventID, suffix)
	}
	if got[1].Event.EventID != "inspect-"+suffix+"-2" {
		t.Fatalf("second=%s want inspect-%s-2", got[1].Event.EventID, suffix)
	}
	if got[0].Attempts != 3 || got[0].Error != "fail-3" {
		t.Fatalf("payload=%+v", got[0])
	}
}

func TestReadRecentEmptyTopic(t *testing.T) {
	brokers := os.Getenv("KAFKA_BROKERS")
	if brokers == "" {
		t.Skip("KAFKA_BROKERS required")
	}
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	topic := "player.events.dlq.empty-" + suffix
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	got, err := ReadRecent(ctx, []string{brokers}, topic, 20)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if len(got) != 0 {
		t.Fatalf("len=%d want 0", len(got))
	}
}
