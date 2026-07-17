package ledger_test

import (
	"context"
	"os"
	"sync"
	"testing"

	"github.com/o-mid/engagepulse/internal/ledger"
	"github.com/o-mid/engagepulse/internal/store"
)

func TestCreditOnceUnderDuplicateDelivery(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL not set")
	}

	ctx := context.Background()
	st, err := store.Open(ctx, dsn)
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	defer st.Close()
	if err := st.Migrate(ctx); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	tenantID := "acme-casino"
	playerID := "ledger-dup-player"
	eventID := "evt-ledger-dup-1"
	if err := st.EnsurePlayer(ctx, tenantID, playerID); err != nil {
		t.Fatalf("ensure player: %v", err)
	}

	l := ledger.New(st.Pool())
	var wg sync.WaitGroup
	errs := make(chan error, 8)
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			errs <- l.Credit(ctx, tenantID, playerID, eventID, "welcome_offer", 100)
		}()
	}
	wg.Wait()
	close(errs)

	var credits, dupes, other int
	for err := range errs {
		switch {
		case err == nil:
			credits++
		case err == ledger.ErrDuplicateCredit:
			dupes++
		default:
			other++
			t.Errorf("unexpected error: %v", err)
		}
	}
	if credits != 1 {
		t.Fatalf("credits=%d want 1", credits)
	}
	if dupes != 7 {
		t.Fatalf("dupes=%d want 7", dupes)
	}

	bal, err := l.Balance(ctx, tenantID, playerID)
	if err != nil {
		t.Fatalf("balance: %v", err)
	}
	if bal != 100 {
		t.Fatalf("balance=%d want 100", bal)
	}
}
