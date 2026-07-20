package worker_test

import (
	"context"
	"os"
	"testing"
	"time"

	"log/slog"

	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/store"
	"github.com/o-mid/engagepulse/internal/worker"
)

func TestIngestToStateWelcomeOffer(t *testing.T) {
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

	tenantID := "nova-sports"
	playerID := "integ-player-1"
	if err := st.EnsurePlayer(ctx, tenantID, playerID); err != nil {
		t.Fatalf("ensure: %v", err)
	}

	w := worker.New(st, slog.Default())
	evt := domain.Event{
		EventID:    "integ-deposit-1",
		TenantID:   tenantID,
		PlayerID:   playerID,
		Type:       domain.EventDeposit,
		Amount:     25,
		OccurredAt: time.Now().UTC(),
	}
	if err := w.Handle(ctx, evt); err != nil {
		t.Fatalf("handle: %v", err)
	}
	if err := w.Handle(ctx, evt); err != nil {
		t.Fatalf("replay handle: %v", err)
	}

	snap, err := st.GetPlayerSnapshot(ctx, tenantID, playerID)
	if err != nil {
		t.Fatalf("snapshot: %v", err)
	}
	found := false
	for _, tag := range snap.OfferTags {
		if tag == domain.OfferWelcomeBonus {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("missing welcome tag: %#v", snap.OfferTags)
	}
	if snap.Balance != 100 {
		t.Fatalf("balance=%d want 100", snap.Balance)
	}
}
