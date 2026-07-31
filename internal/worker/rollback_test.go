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

func TestHandleRollsBackWhenProcessingFailsAfterMark(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL not set")
	}

	ctx := context.Background()
	st, err := store.Open(ctx, dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer st.Close()
	if err := st.Migrate(ctx); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	tenantID := "acme-casino"
	playerID := "rollback-player-" + suffix
	eventID := "rollback-evt-" + suffix

	w := New(st, slog.Default())
	w.failAfterMark = errors.New("injected failure after mark")

	evt := domain.Event{
		EventID:    eventID,
		TenantID:   tenantID,
		PlayerID:   playerID,
		Type:       domain.EventDeposit,
		Amount:     25,
		OccurredAt: time.Now().UTC(),
	}
	if err := w.Handle(ctx, evt); err == nil {
		t.Fatal("handle: want error")
	}

	processed, err := st.IsProcessed(ctx, tenantID, eventID)
	if err != nil {
		t.Fatalf("is processed: %v", err)
	}
	if processed {
		t.Fatal("processed_events row should not remain after rollback")
	}

	_, err = st.GetPlayerSnapshot(ctx, tenantID, playerID)
	if !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("snapshot err=%v want ErrNotFound (no committed player state/balance path)", err)
	}

	// Retry without the inject should succeed and credit once.
	w.failAfterMark = nil
	if err := w.Handle(ctx, evt); err != nil {
		t.Fatalf("retry handle: %v", err)
	}
	snap, err := st.GetPlayerSnapshot(ctx, tenantID, playerID)
	if err != nil {
		t.Fatalf("snapshot after retry: %v", err)
	}
	if snap.Balance != 100 {
		t.Fatalf("balance=%d want 100", snap.Balance)
	}
}
