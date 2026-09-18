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
	err    error
	events []domain.Event
}

func (m *memKafka) Publish(_ context.Context, evt domain.Event) error {
	if m.err != nil {
		return m.err
	}
	m.events = append(m.events, evt)
	return nil
}

func TestReclaimStuckPublishingThenPublishOnce(t *testing.T) {
	st := openTestStore(t)
	ctx := context.Background()
	id := uniqueID(t)
	evt := domain.Event{
		EventID:    "outbox-reclaim-" + id,
		TenantID:   "acme-casino",
		PlayerID:   "outbox-player-reclaim-" + id,
		Type:       domain.EventDeposit,
		Amount:     50,
		OccurredAt: time.Now().UTC(),
	}
	if err := st.EnqueueEvent(ctx, evt); err != nil {
		t.Fatalf("enqueue: %v", err)
	}

	claimed, err := st.ClaimPendingOutbox(ctx, 100)
	if err != nil {
		t.Fatalf("claim: %v", err)
	}
	foundClaim := false
	for _, row := range claimed {
		if row.EventID == evt.EventID {
			foundClaim = true
			if row.Status != store.OutboxPublishing {
				t.Fatalf("claimed status=%s want publishing", row.Status)
			}
		}
	}
	if !foundClaim {
		t.Fatalf("claim missed %s", evt.EventID)
	}

	stuck, err := st.GetOutbox(ctx, evt.TenantID, evt.EventID)
	if err != nil {
		t.Fatalf("get stuck: %v", err)
	}
	if stuck.Status != store.OutboxPublishing {
		t.Fatalf("stuck status=%s want publishing", stuck.Status)
	}

	if err = st.ReclaimPublishingOutbox(ctx); err != nil {
		t.Fatalf("reclaim: %v", err)
	}
	reclaimed, err := st.GetOutbox(ctx, evt.TenantID, evt.EventID)
	if err != nil {
		t.Fatalf("get reclaimed: %v", err)
	}
	if reclaimed.Status != store.OutboxPending {
		t.Fatalf("reclaimed status=%s want pending", reclaimed.Status)
	}
	if reclaimed.LastError != "reclaimed stale publish" {
		t.Fatalf("last_error=%q want reclaimed stale publish", reclaimed.LastError)
	}

	k := &memKafka{}
	p := outbox.NewPublisher(st, k, nil)
	if err = p.FlushOnce(ctx); err != nil {
		t.Fatalf("flush: %v", err)
	}
	if n := countPublished(k, evt.EventID); n != 1 {
		t.Fatalf("published=%d want 1 after reclaim", n)
	}
	row, err := st.GetOutbox(ctx, evt.TenantID, evt.EventID)
	if err != nil {
		t.Fatalf("get published: %v", err)
	}
	if row.Status != store.OutboxPublished {
		t.Fatalf("status=%s want published", row.Status)
	}

	if err = p.FlushOnce(ctx); err != nil {
		t.Fatalf("second flush: %v", err)
	}
	if n := countPublished(k, evt.EventID); n != 1 {
		t.Fatalf("published=%d want 1 after second flush", n)
	}
}

func countPublished(k *memKafka, eventID string) int {
	n := 0
	for _, published := range k.events {
		if published.EventID == eventID {
			n++
		}
	}
	return n
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
	if err = st.Migrate(ctx); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return st
}

func uniqueID(t *testing.T) string {
	t.Helper()
	return fmt.Sprintf("%d", time.Now().UnixNano())
}
