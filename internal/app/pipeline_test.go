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
	"github.com/o-mid/engagepulse/internal/metrics"
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
	if err := kafka.EnsureTopic([]string{brokers}, topic); err != nil {
		t.Fatalf("topic: %v", err)
	}

	st, err := store.Open(ctx, dsn)
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	defer st.Close()
	if err = st.Migrate(ctx); err != nil {
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
		if err = op.FlushOnce(ctx); err != nil {
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
		var msg kafkago.Message
		msg, err = reader.FetchMessage(readCtx)
		if err != nil {
			t.Fatalf("fetch kafka: %v", err)
		}
		if err = json.Unmarshal(msg.Value, &got); err != nil {
			t.Fatalf("unmarshal: %v", err)
		}
		_ = reader.CommitMessages(readCtx, msg)
		if got.EventID == eventID {
			break
		}
	}

	w := worker.New(st, logger)
	if err = w.Handle(ctx, got); err != nil {
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

// Proves: signed poison event retries 3×, lands on Kafka DLQ, balance unchanged.
func TestPoisonSignedEventRetriesThenKafkaDLQ(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	brokers := os.Getenv("KAFKA_BROKERS")
	if dsn == "" || brokers == "" {
		t.Skip("DATABASE_URL and KAFKA_BROKERS required")
	}

	ctx := context.Background()
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	topic := "player.events.poison-" + suffix
	dlqTopic := "player.events.dlq.poison-" + suffix
	if err := kafka.EnsureTopic([]string{brokers}, topic); err != nil {
		t.Fatalf("topic: %v", err)
	}
	if err := kafka.EnsureTopic([]string{brokers}, dlqTopic); err != nil {
		t.Fatalf("dlq topic: %v", err)
	}

	st, err := store.Open(ctx, dsn)
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	defer st.Close()
	if err = st.Migrate(ctx); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	api := httpapi.New(st, st, logger)
	srv := httptest.NewServer(api.Handler())
	defer srv.Close()

	tenantID := "acme-casino"
	playerID := "poison-player-" + suffix
	eventID := worker.FailInjectPrefix + suffix
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

	pub := kafka.NewProducer([]string{brokers}, topic)
	defer func() { _ = pub.Close() }()
	dlqPub := kafka.NewProducer([]string{brokers}, dlqTopic)
	defer func() { _ = dlqPub.Close() }()

	w := worker.New(st, logger)
	w.SetFailInject(true)
	consumer := kafka.NewConsumer(
		[]string{brokers},
		topic,
		"engagepulse-poison-"+suffix,
		logger,
		w.Handle,
		dlqPub,
	).WithRetry(kafka.MaxAttempts, time.Millisecond)
	defer func() { _ = consumer.Close() }()

	retriesBefore := metrics.JSONSnapshot().ConsumerRetries
	dlqBefore := metrics.JSONSnapshot().ConsumerDLQ

	runCtx, cancel := context.WithCancel(ctx)
	defer cancel()
	errCh := make(chan error, 1)
	go func() { errCh <- consumer.Run(runCtx) }()

	op := outbox.NewPublisher(st, pub, logger)
	deadline := time.Now().Add(20 * time.Second)
	var row store.OutboxRow
	for {
		if err = op.FlushOnce(ctx); err != nil {
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

	dlqReader := kafkago.NewReader(kafkago.ReaderConfig{
		Brokers:     []string{brokers},
		Topic:       dlqTopic,
		Partition:   0,
		MinBytes:    1,
		MaxBytes:    10e6,
		StartOffset: kafkago.FirstOffset,
	})
	defer func() { _ = dlqReader.Close() }()

	readCtx, readCancel := context.WithTimeout(ctx, 20*time.Second)
	defer readCancel()
	var letter kafka.DeadLetter
	for {
		var msg kafkago.Message
		msg, err = dlqReader.ReadMessage(readCtx)
		if err != nil {
			t.Fatalf("read dlq: %v", err)
		}
		letter, err = kafka.ParseDeadLetter(msg.Value)
		if err != nil {
			t.Fatalf("parse dlq: %v", err)
		}
		if letter.Event.EventID == eventID {
			break
		}
	}
	cancel()

	if letter.Attempts != kafka.MaxAttempts {
		t.Fatalf("dlq attempts=%d want %d", letter.Attempts, kafka.MaxAttempts)
	}
	if !strings.Contains(letter.Error, worker.ErrInjectedFailure.Error()) {
		t.Fatalf("dlq error=%q", letter.Error)
	}

	snap := metrics.JSONSnapshot()
	if snap.ConsumerRetries-retriesBefore < 2 {
		t.Fatalf("retries delta=%v want >=2", snap.ConsumerRetries-retriesBefore)
	}
	if snap.ConsumerDLQ-dlqBefore < 1 {
		t.Fatalf("dlq delta=%v want >=1", snap.ConsumerDLQ-dlqBefore)
	}

	processed, err := st.IsProcessed(ctx, tenantID, eventID)
	if err != nil {
		t.Fatalf("is processed: %v", err)
	}
	if processed {
		t.Fatal("poison event must not be marked processed")
	}
	var playerSnap domain.PlayerSnapshot
	playerSnap, err = st.GetPlayerSnapshot(ctx, tenantID, playerID)
	if err != nil {
		t.Fatalf("snapshot: %v", err)
	}
	if playerSnap.Balance != 0 {
		t.Fatalf("poison event credited balance=%d want 0", playerSnap.Balance)
	}
}

// Proves: list last N dead letters, then a new signed ingest of the same event_id credits once.
func TestDLQInspectThenRedriveCreditOnce(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	brokers := os.Getenv("KAFKA_BROKERS")
	if dsn == "" || brokers == "" {
		t.Skip("DATABASE_URL and KAFKA_BROKERS required")
	}

	ctx := context.Background()
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	topic := "player.events.redrive-" + suffix
	dlqTopic := "player.events.dlq.redrive-" + suffix
	if err := kafka.EnsureTopic([]string{brokers}, topic); err != nil {
		t.Fatalf("topic: %v", err)
	}
	if err := kafka.EnsureTopic([]string{brokers}, dlqTopic); err != nil {
		t.Fatalf("dlq topic: %v", err)
	}

	st, err := store.Open(ctx, dsn)
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	defer st.Close()
	if err = st.Migrate(ctx); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	api := httpapi.New(st, st, logger)
	api.SetDLQ(kafka.NewInspector([]string{brokers}, dlqTopic))
	srv := httptest.NewServer(api.Handler())
	defer srv.Close()

	tenantID := "acme-casino"
	playerID := "redrive-player-" + suffix
	eventID := "redrive-evt-" + suffix
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
	dlqPub := kafka.NewProducer([]string{brokers}, dlqTopic)
	if err = dlqPub.PublishDLQ(ctx, evt, "injected", kafka.MaxAttempts); err != nil {
		t.Fatalf("publish dlq: %v", err)
	}
	if err = dlqPub.Close(); err != nil {
		t.Fatalf("close dlq: %v", err)
	}

	listCtx, listCancel := context.WithTimeout(ctx, 15*time.Second)
	defer listCancel()
	var listed kafka.DeadLetter
	for {
		req, reqErr := http.NewRequest(http.MethodGet, srv.URL+"/v1/dlq?n=20", nil)
		if reqErr != nil {
			t.Fatalf("list request: %v", reqErr)
		}
		req.Header.Set("X-API-Key", "ak_acme_dev_001")
		resp, doErr := http.DefaultClient.Do(req)
		if doErr != nil {
			t.Fatalf("list: %v", doErr)
		}
		var out struct {
			Items []kafka.DeadLetter `json:"items"`
		}
		if err = json.NewDecoder(resp.Body).Decode(&out); err != nil {
			_ = resp.Body.Close()
			t.Fatalf("decode list: %v", err)
		}
		_ = resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("list status=%d", resp.StatusCode)
		}
		for _, item := range out.Items {
			if item.Event.EventID == eventID {
				listed = item
				break
			}
		}
		if listed.Event.EventID == eventID {
			break
		}
		select {
		case <-listCtx.Done():
			t.Fatalf("letter %s not listed", eventID)
		case <-time.After(200 * time.Millisecond):
		}
	}
	if listed.Attempts != kafka.MaxAttempts {
		t.Fatalf("listed attempts=%d", listed.Attempts)
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
		t.Fatalf("redrive: %v", err)
	}
	_ = resp.Body.Close()
	if resp.StatusCode != http.StatusAccepted {
		t.Fatalf("redrive status=%d", resp.StatusCode)
	}

	pub := kafka.NewProducer([]string{brokers}, topic)
	defer func() { _ = pub.Close() }()
	consumerDLQ := kafka.NewProducer([]string{brokers}, dlqTopic)
	defer func() { _ = consumerDLQ.Close() }()
	w := worker.New(st, logger)
	consumer := kafka.NewConsumer(
		[]string{brokers},
		topic,
		"engagepulse-redrive-"+suffix,
		logger,
		w.Handle,
		consumerDLQ,
	)
	defer func() { _ = consumer.Close() }()
	runCtx, cancel := context.WithCancel(ctx)
	defer cancel()
	go func() { _ = consumer.Run(runCtx) }()

	op := outbox.NewPublisher(st, pub, logger)
	deadline := time.Now().Add(20 * time.Second)
	for {
		if err = op.FlushOnce(ctx); err != nil {
			t.Fatalf("flush: %v", err)
		}
		row, getErr := st.GetOutbox(ctx, tenantID, eventID)
		if getErr != nil {
			t.Fatalf("outbox: %v", getErr)
		}
		if row.Status == store.OutboxPublished {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("outbox not published; status=%s", row.Status)
		}
		time.Sleep(100 * time.Millisecond)
	}

	var snap domain.PlayerSnapshot
	for {
		snap, err = st.GetPlayerSnapshot(ctx, tenantID, playerID)
		if err == nil && snap.Balance > 0 {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("redrive not credited: %v balance=%d", err, snap.Balance)
		}
		time.Sleep(100 * time.Millisecond)
	}
	first := snap.Balance

	req, err = http.NewRequest(http.MethodPost, srv.URL+"/v1/events", bytes.NewReader(body))
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Signature", ingest.Sign(tenant.HMACSecret, body))
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("second ingest: %v", err)
	}
	_ = resp.Body.Close()
	if resp.StatusCode != http.StatusAccepted {
		t.Fatalf("second ingest status=%d", resp.StatusCode)
	}
	time.Sleep(300 * time.Millisecond)
	snap, err = st.GetPlayerSnapshot(ctx, tenantID, playerID)
	if err != nil {
		t.Fatalf("snapshot: %v", err)
	}
	if snap.Balance != first {
		t.Fatalf("second redrive balance=%d want %d", snap.Balance, first)
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
