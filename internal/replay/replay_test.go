package replay_test

import (
	"bufio"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"runtime"
	"slices"
	"testing"

	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/store"
	"github.com/o-mid/engagepulse/internal/worker"
)

func TestReplayPacks(t *testing.T) {
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

	w := worker.New(st, slog.New(slog.NewTextHandler(io.Discard, nil)))
	for _, brand := range []string{"acme-casino", "nova-sports"} {
		t.Run(brand, func(t *testing.T) {
			dir := packDir(t, brand)
			events := loadEvents(t, filepath.Join(dir, "events.jsonl"))
			want := loadExpected(t, filepath.Join(dir, "expected-player.json"))

			apply(t, ctx, w, events)
			apply(t, ctx, w, events)

			got, err := st.GetPlayerSnapshot(ctx, want.TenantID, want.PlayerID)
			if err != nil {
				t.Fatalf("snapshot: %v", err)
			}
			if !snapshotContract(got, want) {
				t.Fatalf("snapshot drift\ngot  %+v\nwant %+v", contractFields(got), contractFields(want))
			}
		})
	}
}

func apply(t *testing.T, ctx context.Context, w *worker.Worker, events []domain.Event) {
	t.Helper()
	for _, evt := range events {
		if err := w.Handle(ctx, evt); err != nil {
			t.Fatalf("handle %s: %v", evt.EventID, err)
		}
	}
}

func snapshotContract(got, want domain.PlayerSnapshot) bool {
	return got.TenantID == want.TenantID &&
		got.PlayerID == want.PlayerID &&
		got.Score == want.Score &&
		got.VIPTier == want.VIPTier &&
		slices.Equal(got.OfferTags, want.OfferTags) &&
		got.IntegrityFlag == want.IntegrityFlag &&
		got.Balance == want.Balance
}

type contract struct {
	TenantID      string   `json:"tenant_id"`
	PlayerID      string   `json:"player_id"`
	Score         int64    `json:"score"`
	VIPTier       string   `json:"vip_tier"`
	OfferTags     []string `json:"offer_tags"`
	IntegrityFlag string   `json:"integrity_flag"`
	Balance       int64    `json:"balance"`
}

func contractFields(s domain.PlayerSnapshot) contract {
	return contract{
		TenantID:      s.TenantID,
		PlayerID:      s.PlayerID,
		Score:         s.Score,
		VIPTier:       s.VIPTier,
		OfferTags:     s.OfferTags,
		IntegrityFlag: s.IntegrityFlag,
		Balance:       s.Balance,
	}
}

func packDir(t *testing.T, brand string) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("caller path")
	}
	return filepath.Join(filepath.Dir(file), "..", "..", "testdata", "replay", brand)
}

func loadEvents(t *testing.T, path string) []domain.Event {
	t.Helper()
	f, err := os.Open(path)
	if err != nil {
		t.Fatalf("open %s: %v", path, err)
	}
	defer func() { _ = f.Close() }()

	sc := bufio.NewScanner(f)
	var events []domain.Event
	for sc.Scan() {
		line := sc.Bytes()
		if len(line) == 0 {
			continue
		}
		var evt domain.Event
		err = json.Unmarshal(line, &evt)
		if err != nil {
			t.Fatalf("event %s: %v", path, err)
		}
		events = append(events, evt)
	}
	if err := sc.Err(); err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	if len(events) == 0 {
		t.Fatalf("no events in %s", path)
	}
	return events
}

func loadExpected(t *testing.T, path string) domain.PlayerSnapshot {
	t.Helper()
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	var snap domain.PlayerSnapshot
	err = json.Unmarshal(raw, &snap)
	if err != nil {
		t.Fatalf("expected %s: %v", path, err)
	}
	return snap
}
