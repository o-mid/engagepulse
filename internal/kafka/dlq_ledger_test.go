package kafka

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/store"
)

func TestPermanentFailureLandsInDLQWithoutLedgerCredit(t *testing.T) {
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

	tenantID := "acme-casino"
	playerID := "dlq-no-credit"
	if err := st.EnsurePlayer(ctx, tenantID, playerID); err != nil {
		t.Fatalf("ensure: %v", err)
	}
	before, err := st.GetBalance(ctx, tenantID, playerID)
	if err != nil {
		t.Fatalf("balance: %v", err)
	}

	dlq := &memDLQ{}
	c := &Consumer{
		logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
		handler: func(context.Context, domain.Event) error {
			return errors.New("injected fault")
		},
		dlq:         dlq,
		maxAttempts: 3,
		backoff:     time.Millisecond,
	}
	evt := domain.Event{
		EventID:    "dlq-no-credit-1",
		TenantID:   tenantID,
		PlayerID:   playerID,
		Type:       domain.EventDeposit,
		Amount:     50,
		OccurredAt: time.Now().UTC(),
	}
	if err := c.processEvent(ctx, evt); err != nil {
		t.Fatalf("process: %v", err)
	}
	if dlq.calls != 1 {
		t.Fatalf("dlq=%d want 1", dlq.calls)
	}
	after, err := st.GetBalance(ctx, tenantID, playerID)
	if err != nil {
		t.Fatalf("balance after: %v", err)
	}
	if after != before {
		t.Fatalf("balance changed %d -> %d", before, after)
	}
}
