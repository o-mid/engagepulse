package replay_test

import (
	"context"
	"io"
	"log/slog"
	"os"
	"testing"

	"github.com/o-mid/engagepulse/internal/replay"
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
	if err = st.Migrate(ctx); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	w := worker.New(st, slog.New(slog.NewTextHandler(io.Discard, nil)))
	report, err := replay.Run(ctx, st, w)
	if err != nil {
		t.Fatalf("replay: %v", err)
	}
	for _, br := range report.Results {
		if !br.Pass {
			t.Errorf("%s snapshot drift\ngot  %+v\nwant %+v", br.Brand, replay.ContractOf(br.Got), replay.ContractOf(br.Want))
		}
	}
	if !report.AllPass() {
		t.Fatal("replay pack drifted")
	}
}

func TestReplayPacksViaKafka(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	brokers := os.Getenv("KAFKA_BROKERS")
	if dsn == "" || brokers == "" {
		t.Skip("DATABASE_URL and KAFKA_BROKERS required")
	}

	ctx := context.Background()
	st, err := store.Open(ctx, dsn)
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	defer st.Close()
	if err = st.Migrate(ctx); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	w := worker.New(st, slog.New(slog.NewTextHandler(io.Discard, nil)))
	report, err := replay.RunViaKafka(ctx, replay.KafkaRun{
		Store:   st,
		Worker:  w,
		Brokers: []string{brokers},
	})
	if err != nil {
		t.Fatalf("replay kafka: %v", err)
	}
	for _, br := range report.Results {
		if !br.Pass {
			t.Errorf("%s snapshot drift\ngot  %+v\nwant %+v", br.Brand, replay.ContractOf(br.Got), replay.ContractOf(br.Want))
		}
	}
	if !report.AllPass() {
		t.Fatal("kafka replay pack drifted")
	}
}
