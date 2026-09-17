package shadow_test

import (
	"context"
	"strings"
	"testing"

	"github.com/o-mid/engagepulse/internal/replay"
	"github.com/o-mid/engagepulse/internal/rules"
	"github.com/o-mid/engagepulse/internal/shadow"
)

func TestNewDefaultIsMock(t *testing.T) {
	s, err := shadow.New("", "", "", nil)
	if err != nil {
		t.Fatalf("new: %v", err)
	}
	events, err := replay.LoadEvents("nova-sports")
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	dec, err := s.Score(context.Background(), events)
	if err != nil {
		t.Fatalf("score: %v", err)
	}
	if !dec.Flag {
		t.Fatal("mock should flag nova")
	}
}

func TestOpenAIWithoutKeyFailsClosed(t *testing.T) {
	_, err := shadow.New("openai", "", "", nil)
	if err == nil || !strings.Contains(err.Error(), "OPENAI_API_KEY") {
		t.Fatalf("err=%v", err)
	}
}

func TestUnknownScorerFailsClosed(t *testing.T) {
	_, err := shadow.New("nope", "sk", "", nil)
	if err == nil || !strings.Contains(err.Error(), "unknown SHADOW_SCORER") {
		t.Fatalf("err=%v", err)
	}
}

func TestMockAgreesOnReplayPacks(t *testing.T) {
	board, err := shadow.Compare(context.Background(), shadow.Mock{})
	if err != nil {
		t.Fatalf("compare: %v", err)
	}
	got := map[string]shadow.Row{}
	for _, row := range board.Rows {
		got[row.Pack] = row
	}
	acme, ok := got["acme-casino"]
	if !ok {
		t.Fatal("missing acme-casino")
	}
	if acme.RuleFlag || acme.ModelFlag || !acme.Agree {
		t.Fatalf("acme=%+v", acme)
	}
	nova, ok := got["nova-sports"]
	if !ok {
		t.Fatal("missing nova-sports")
	}
	if !nova.RuleFlag || !nova.ModelFlag || !nova.Agree {
		t.Fatalf("nova=%+v", nova)
	}
}

func TestMockDisagreesOnSparseBets(t *testing.T) {
	events, err := replay.LoadEvents("sparse-bets")
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if shadow.RuleWouldFlag(events, rules.VelocityBetLimit) {
		t.Fatal("rule should not flag 5 bets spaced 90s apart")
	}
	dec, err := (shadow.Mock{}).Score(context.Background(), events)
	if err != nil {
		t.Fatalf("score: %v", err)
	}
	if !dec.Flag {
		t.Fatal("mock should flag pack bets >= velocity limit")
	}

	board, err := shadow.Compare(context.Background(), shadow.Mock{})
	if err != nil {
		t.Fatalf("compare: %v", err)
	}
	var sparse shadow.Row
	for _, row := range board.Rows {
		if row.Pack == "sparse-bets" {
			sparse = row
		}
	}
	if sparse.Pack == "" {
		t.Fatal("missing sparse-bets")
	}
	if sparse.Agree {
		t.Fatalf("want disagreement on sparse-bets: %+v", sparse)
	}
	if sparse.RuleFlag || !sparse.ModelFlag {
		t.Fatalf("sparse=%+v", sparse)
	}
	if len(board.Disagreements()) == 0 {
		t.Fatal("disagreement board empty")
	}
	out := shadow.Format(board)
	if !strings.Contains(out, "sparse-bets") || !strings.Contains(out, "no") {
		t.Fatalf("format=%q", out)
	}
}
