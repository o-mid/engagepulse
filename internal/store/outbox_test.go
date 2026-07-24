package store_test

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/outbox"
	"github.com/o-mid/engagepulse/internal/store"
)

func TestEnqueueCreatesOutboxRow(t *testing.T) {
	st := openTestStore(t)
	ctx := context.Background()
	id := uniqueID(t)

	evt := domain.Event{
		EventID:    "outbox-insert-" + id,
		TenantID:   "acme-casino",
		PlayerID:   "outbox-player-" + id,
		Type:       domain.EventDeposit,
		Amount:     25,
		OccurredAt: time.Now().UTC(),
	}
	if err := st.EnqueueEvent(ctx, evt); err != nil {
		t.Fatalf("enqueue: %v", err)
	}
	row, err := st.GetOutbox(ctx, evt.TenantID, evt.EventID)
	if err != nil {
		t.Fatalf("get outbox: %v", err)
	}
	if row.Status != store.OutboxPending {
		t.Fatalf("status=%s want pending", row.Status)
	}
	var got domain.Event
	if err := json.Unmarshal(row.Payload, &got); err != nil {
		t.Fatalf("payload: %v", err)
	}
	if got.EventID != evt.EventID || got.Amount != evt.Amount {
		t.Fatalf("payload mismatch: %#v", got)
	}
}

func TestEnqueueDuplicateIsIdempotent(t *testing.T) {
	st := openTestStore(t)
	ctx := context.Background()
	id := uniqueID(t)
	evt := domain.Event{
		EventID:    "outbox-dup-" + id,
		TenantID:   "acme-casino",
		PlayerID:   "outbox-player-dup-" + id,
		Type:       domain.EventDeposit,
		Amount:     10,
		OccurredAt: time.Now().UTC(),
	}
	if err := st.EnqueueEvent(ctx, evt); err != nil {
		t.Fatalf("first enqueue: %v", err)
	}
	if err := st.EnqueueEvent(ctx, evt); !errors.Is(err, store.ErrDuplicateEvent) {
		t.Fatalf("second enqueue err=%v want ErrDuplicateEvent", err)
	}
	n, err := st.CountOutbox(ctx, evt.TenantID, evt.EventID)
	if err != nil {
		t.Fatalf("count: %v", err)
	}
	if n != 1 {
		t.Fatalf("count=%d want 1", n)
	}
}

type memKafka struct {
	events []domain.Event
	err    error
}

func (m *memKafka) Publish(_ context.Context, evt domain.Event) error {
	if m.err != nil {
		return m.err
	}
	m.events = append(m.events, evt)
	return nil
}

func TestPublisherMarksPublished(t *testing.T) {
	st := openTestStore(t)
	ctx := context.Background()
	id := uniqueID(t)
	evt := domain.Event{
		EventID:    "outbox-pub-" + id,
		TenantID:   "nova-sports",
		PlayerID:   "outbox-player-pub-" + id,
		Type:       domain.EventBetPlaced,
		Amount:     40,
		OccurredAt: time.Now().UTC(),
	}
	if err := st.EnqueueEvent(ctx, evt); err != nil {
		t.Fatalf("enqueue: %v", err)
	}

	k := &memKafka{}
	p := outbox.NewPublisher(st, k, nil)
	if err := p.FlushOnce(ctx); err != nil {
		t.Fatalf("flush: %v", err)
	}
	found := false
	for _, published := range k.events {
		if published.EventID == evt.EventID {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("event %s not published; got %v", evt.EventID, k.events)
	}
	row, err := st.GetOutbox(ctx, evt.TenantID, evt.EventID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if row.Status != store.OutboxPublished {
		t.Fatalf("status=%s want published", row.Status)
	}
}

func openTestStore(t *testing.T) *store.Store {
	t.Helper()
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL not set")
	}
	ctx := context.Background()
	st, err := store.Open(ctx, dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	t.Cleanup(st.Close)
	if err := st.Migrate(ctx); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return st
}

func uniqueID(t *testing.T) string {
	t.Helper()
	return fmt.Sprintf("%d", time.Now().UnixNano())
}
