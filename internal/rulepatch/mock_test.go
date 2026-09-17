package rulepatch_test

import (
	"context"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/o-mid/engagepulse/internal/replay"
	"github.com/o-mid/engagepulse/internal/rulepatch"
	"github.com/o-mid/engagepulse/internal/rules"
	"github.com/o-mid/engagepulse/internal/store"
	"github.com/o-mid/engagepulse/internal/worker"
)

func TestMockProposeVelocity(t *testing.T) {
	p, err := (rulepatch.Mock{}).Propose(context.Background(), "raise velocity threshold", rules.Defaults())
	if err != nil {
		t.Fatalf("propose: %v", err)
	}
	if p.Thresholds.VelocityBetLimit != rules.VelocityBetLimit+3 {
		t.Fatalf("velocity=%d", p.Thresholds.VelocityBetLimit)
	}
	if !strings.Contains(p.Diff, "+\tVelocityBetLimit int64 = 8") {
		t.Fatalf("diff=%q", p.Diff)
	}
}

func TestPatchedReplayFailsNovaAndDoesNotWrite(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL not set")
	}

	src := thresholdsPath(t)
	before, err := os.ReadFile(src)
	if err != nil {
		t.Fatalf("read thresholds: %v", err)
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

	patch, err := (rulepatch.Mock{}).Propose(ctx, "raise velocity threshold", rules.Defaults())
	if err != nil {
		t.Fatalf("propose: %v", err)
	}
	eng := rules.New()
	eng.T = patch.Thresholds
	w := worker.NewWithRules(st, slog.New(slog.NewTextHandler(io.Discard, nil)), eng)
	report, err := replay.Run(ctx, st, w)
	if err != nil {
		t.Fatalf("replay: %v", err)
	}

	var nova replay.BrandResult
	for _, br := range report.Results {
		if br.Brand == "nova-sports" {
			nova = br
		}
	}
	if nova.Pass {
		t.Fatal("nova replay passed after raising velocity limit; want fail")
	}
	if nova.Got.IntegrityFlag == "velocity" {
		t.Fatalf("nova still flagged velocity after patch")
	}

	after, err := os.ReadFile(src)
	if err != nil {
		t.Fatalf("re-read thresholds: %v", err)
	}
	if string(before) != string(after) {
		t.Fatal("thresholds.go changed on disk")
	}
}

func thresholdsPath(t *testing.T) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("caller path")
	}
	return filepath.Join(filepath.Dir(file), "..", "rules", "thresholds.go")
}
