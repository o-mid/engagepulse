package worker

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/store"
)

func TestFailInjectPoisonsMatchingEventWithoutCredit(t *testing.T) {
	st := openStore(t)
	defer st.Close()
	ctx := context.Background()

	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	tenantID := "acme-casino"
	playerID := "inject-player-" + suffix
	eventID := FailInjectPrefix + suffix

	w := New(st, slog.Default())
	w.SetFailInject(true)

	err := w.Handle(ctx, depositEvent(tenantID, playerID, eventID))
	if !errors.Is(err, ErrInjectedFailure) {
		t.Fatalf("handle err=%v want ErrInjectedFailure", err)
	}

	processed, err := st.IsProcessed(ctx, tenantID, eventID)
	if err != nil {
		t.Fatalf("is processed: %v", err)
	}
	if processed {
		t.Fatal("poison event must not stay marked processed")
	}
	_, err = st.GetPlayerSnapshot(ctx, tenantID, playerID)
	if !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("snapshot err=%v want ErrNotFound", err)
	}
}

func TestFailInjectLeavesDefaultIngestAlone(t *testing.T) {
	st := openStore(t)
	defer st.Close()
	ctx := context.Background()

	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	tenantID := "acme-casino"
	w := New(st, slog.Default())
	w.SetFailInject(true)

	normalID := "deposit-" + suffix
	if err := w.Handle(ctx, depositEvent(tenantID, "inject-ok-"+suffix, normalID)); err != nil {
		t.Fatalf("normal handle: %v", err)
	}
	snap, err := st.GetPlayerSnapshot(ctx, tenantID, "inject-ok-"+suffix)
	if err != nil {
		t.Fatalf("snapshot: %v", err)
	}
	if snap.Balance != 100 {
		t.Fatalf("balance=%d want 100", snap.Balance)
	}

	off := New(st, slog.Default())
	poisonID := FailInjectPrefix + "off-" + suffix
	err = off.Handle(ctx, depositEvent(tenantID, "inject-off-"+suffix, poisonID))
	if err != nil {
		t.Fatalf("inject-off handle: %v", err)
	}
	snap, err = st.GetPlayerSnapshot(ctx, tenantID, "inject-off-"+suffix)
	if err != nil {
		t.Fatalf("snapshot inject-off: %v", err)
	}
	if snap.Balance != 100 {
		t.Fatalf("prefix alone must not poison; balance=%d", snap.Balance)
	}
}

func openStore(t *testing.T) *store.Store {
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
	if err = st.Migrate(ctx); err != nil {
		st.Close()
		t.Fatalf("migrate: %v", err)
	}
	return st
}

func depositEvent(tenantID, playerID, eventID string) domain.Event {
	return domain.Event{
		EventID:    eventID,
		TenantID:   tenantID,
		PlayerID:   playerID,
		Type:       domain.EventDeposit,
		Amount:     25,
		OccurredAt: time.Now().UTC(),
	}
}
