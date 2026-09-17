package shadow_test

import (
	"context"
	"fmt"
	"go/parser"
	"go/token"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/ledger"
	"github.com/o-mid/engagepulse/internal/replay"
	"github.com/o-mid/engagepulse/internal/rules"
	"github.com/o-mid/engagepulse/internal/shadow"
	"github.com/o-mid/engagepulse/internal/store"
	"github.com/o-mid/engagepulse/internal/worker"
)

func TestShadowPackageDoesNotImportLedgerOrWorker(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("caller path")
	}
	dir := filepath.Dir(file)
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("readdir: %v", err)
	}
	fset := token.NewFileSet()
	for _, e := range entries {
		if !strings.HasSuffix(e.Name(), ".go") || strings.HasSuffix(e.Name(), "_test.go") {
			continue
		}
		parsed, err := parser.ParseFile(fset, filepath.Join(dir, e.Name()), nil, parser.ImportsOnly)
		if err != nil {
			t.Fatalf("parse %s: %v", e.Name(), err)
		}
		for _, imp := range parsed.Imports {
			path, err := strconv.Unquote(imp.Path.Value)
			if err != nil {
				t.Fatalf("import %s: %v", e.Name(), err)
			}
			if path == "github.com/o-mid/engagepulse/internal/ledger" || path == "github.com/o-mid/engagepulse/internal/worker" {
				t.Errorf("%s imports %s", e.Name(), path)
			}
		}
	}
}

func TestShadowDoesNotCreditOrChangeBalance(t *testing.T) {
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

	src, err := replay.LoadEvents("acme-casino")
	if err != nil {
		t.Fatalf("load: %v", err)
	}

	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	tenantID := "acme-casino"
	shadowPlayer := "shadow-readonly-" + suffix
	workerPlayer := "shadow-worker-" + suffix

	if err := st.EnsurePlayer(ctx, tenantID, shadowPlayer); err != nil {
		t.Fatalf("ensure: %v", err)
	}

	before, err := st.GetPlayerSnapshot(ctx, tenantID, shadowPlayer)
	if err != nil {
		t.Fatalf("before snapshot: %v", err)
	}
	beforeN := countLedger(t, ctx, st, tenantID, shadowPlayer)

	shadowEvents := retarget(src, shadowPlayer, suffix+"-s")
	_, err = (shadow.Mock{}).Score(ctx, shadowEvents)
	if err != nil {
		t.Fatalf("score: %v", err)
	}
	_ = shadow.RuleWouldFlag(shadowEvents, rules.VelocityBetLimit)
	_, err = shadow.Compare(ctx, shadow.Mock{})
	if err != nil {
		t.Fatalf("compare: %v", err)
	}

	after, err := st.GetPlayerSnapshot(ctx, tenantID, shadowPlayer)
	if err != nil {
		t.Fatalf("after snapshot: %v", err)
	}
	if after.Balance != before.Balance {
		t.Fatalf("balance %d -> %d", before.Balance, after.Balance)
	}
	if after.VIPTier != before.VIPTier {
		t.Fatalf("vip %s -> %s", before.VIPTier, after.VIPTier)
	}
	if after.IntegrityFlag != before.IntegrityFlag {
		t.Fatalf("flag %q -> %q", before.IntegrityFlag, after.IntegrityFlag)
	}
	if after.Score != before.Score {
		t.Fatalf("score %d -> %d", before.Score, after.Score)
	}
	if countLedger(t, ctx, st, tenantID, shadowPlayer) != beforeN {
		t.Fatal("shadow wrote ledger_entries")
	}

	w := worker.New(st, slog.New(slog.NewTextHandler(io.Discard, nil)))
	for _, evt := range retarget(src, workerPlayer, suffix+"-w") {
		if err := w.Handle(ctx, evt); err != nil {
			t.Fatalf("handle %s: %v", evt.EventID, err)
		}
	}
	got, err := st.GetPlayerSnapshot(ctx, tenantID, workerPlayer)
	if err != nil {
		t.Fatalf("worker snapshot: %v", err)
	}
	if got.Balance != 100 {
		t.Fatalf("worker balance=%d want 100", got.Balance)
	}
	if countLedger(t, ctx, st, tenantID, workerPlayer) == 0 {
		t.Fatal("worker should have credited")
	}
	l := ledger.New(st.Pool())
	bal, err := l.Balance(ctx, tenantID, shadowPlayer)
	if err != nil {
		t.Fatalf("shadow balance: %v", err)
	}
	if bal != 0 {
		t.Fatalf("shadow balance=%d want 0", bal)
	}
}

func retarget(src []domain.Event, playerID, suffix string) []domain.Event {
	out := make([]domain.Event, len(src))
	copy(out, src)
	for i := range out {
		out[i].PlayerID = playerID
		out[i].EventID = out[i].EventID + "-" + suffix
	}
	return out
}

func countLedger(t *testing.T, ctx context.Context, st *store.Store, tenantID, playerID string) int64 {
	t.Helper()
	var n int64
	err := st.Pool().QueryRow(ctx, `
		SELECT COUNT(*) FROM ledger_entries WHERE tenant_id=$1 AND player_id=$2
	`, tenantID, playerID).Scan(&n)
	if err != nil {
		t.Fatalf("count ledger: %v", err)
	}
	return n
}
