package app_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/o-mid/engagepulse/internal/api/httpapi"
	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/ingest"
	"github.com/o-mid/engagepulse/internal/kafka"
	"github.com/o-mid/engagepulse/internal/outbox"
	"github.com/o-mid/engagepulse/internal/store"
	"github.com/o-mid/engagepulse/internal/worker"
	kafkago "github.com/segmentio/kafka-go"
)

// Proves: signed HTTP ingest → outbox → Kafka → worker → player snapshot.
func TestIngestThroughSnapshot(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	brokers := os.Getenv("KAFKA_BROKERS")
	if dsn == "" || brokers == "" {
		t.Skip("DATABASE_URL and KAFKA_BROKERS required")
	}
	topic := envOr("KAFKA_TOPIC", "player.events")

	ctx := context.Background()
	ensureKafkaTopic(t, brokers, topic)

	st, err := store.Open(ctx, dsn)
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	defer st.Close()
	if err := st.Migrate(ctx); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	api := httpapi.New(st, st, logger)
	srv := httptest.NewServer(api.Handler())
	defer srv.Close()

	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	tenantID := "acme-casino"
	playerID := "pipe-player-" + suffix
	eventID := "pipe-deposit-" + suffix

	tenant, err := st.GetTenant(ctx, tenantID)
	if err != nil {
		t.Fatalf("tenant: %v", err)
	}

	evt := domain.Event{
		EventID:    eventID,
		TenantID:   tenantID,
		PlayerID:   playerID,
		Type:       domain.EventDeposit,
		Amount:     50,
		OccurredAt: time.Now().UTC(),
	}
	body, err := json.Marshal(evt)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	req, err := http.NewRequest(http.MethodPost, srv.URL+"/v1/events", bytes.NewReader(body))
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Signature", ingest.Sign(tenant.HMACSecret, body))
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("ingest: %v", err)
	}
	_ = resp.Body.Close()
	if resp.StatusCode != http.StatusAccepted {
		t.Fatalf("ingest status=%d", resp.StatusCode)
	}

	row, err := st.GetOutbox(ctx, tenantID, eventID)
	if err != nil {
		t.Fatalf("outbox row: %v", err)
	}
	if row.Status != store.OutboxPending && row.Status != store.OutboxPublishing && row.Status != store.OutboxPublished {
		t.Fatalf("unexpected outbox status %q", row.Status)
	}

	pub := kafka.NewProducer([]string{brokers}, topic)
	defer func() { _ = pub.Close() }()
	op := outbox.NewPublisher(st, pub, logger)

	deadline := time.Now().Add(20 * time.Second)
	for {
		if err := op.FlushOnce(ctx); err != nil {
			t.Fatalf("flush: %v", err)
		}
		row, err = st.GetOutbox(ctx, tenantID, eventID)
		if err != nil {
			t.Fatalf("outbox: %v", err)
		}
		if row.Status == store.OutboxPublished {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("outbox not published; status=%s err=%q", row.Status, row.LastError)
		}
		time.Sleep(100 * time.Millisecond)
	}

	reader := kafkago.NewReader(kafkago.ReaderConfig{
		Brokers:     []string{brokers},
		Topic:       topic,
		GroupID:     "engagepulse-pipeline-test-" + suffix,
		MinBytes:    1,
		MaxBytes:    10e6,
		StartOffset: kafkago.FirstOffset,
	})
	defer func() { _ = reader.Close() }()

	var got domain.Event
	readCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	for {
		msg, err := reader.FetchMessage(readCtx)
		if err != nil {
			t.Fatalf("fetch kafka: %v", err)
		}
		if err := json.Unmarshal(msg.Value, &got); err != nil {
			t.Fatalf("unmarshal: %v", err)
		}
		_ = reader.CommitMessages(readCtx, msg)
		if got.EventID == eventID {
			break
		}
	}

	w := worker.New(st, logger)
	if err := w.Handle(ctx, got); err != nil {
		t.Fatalf("worker: %v", err)
	}

	snap, err := st.GetPlayerSnapshot(ctx, tenantID, playerID)
	if err != nil {
		t.Fatalf("snapshot: %v", err)
	}
	if snap.Balance != 100 {
		t.Fatalf("balance=%d want 100", snap.Balance)
	}
	found := false
	for _, tag := range snap.OfferTags {
		if tag == domain.OfferWelcomeBonus {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("missing welcome_bonus; tags=%v", snap.OfferTags)
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// Create the topic up front so publish does not race Redpanda auto-create.
func ensureKafkaTopic(t *testing.T, brokers, topic string) {
	t.Helper()
	conn, err := kafkago.Dial("tcp", brokers)
	if err != nil {
		t.Fatalf("kafka dial: %v", err)
	}
	defer func() { _ = conn.Close() }()
	controller, err := conn.Controller()
	if err != nil {
		t.Fatalf("kafka controller: %v", err)
	}
	ctrl, err := kafkago.Dial("tcp", fmt.Sprintf("%s:%d", controller.Host, controller.Port))
	if err != nil {
		t.Fatalf("kafka controller dial: %v", err)
	}
	defer func() { _ = ctrl.Close() }()
	err = ctrl.CreateTopics(kafkago.TopicConfig{
		Topic:             topic,
		NumPartitions:     1,
		ReplicationFactor: 1,
	})
	if err != nil && !isTopicExists(err) {
		t.Fatalf("create topic: %v", err)
	}
}

func isTopicExists(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "already exists") || strings.Contains(msg, "topic already present")
}
