package rules

import (
	"slices"
	"testing"

	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/store"
)

func TestApplyWelcome(t *testing.T) {
	e := New()
	tests := []struct {
		name    string
		evt     domain.Event
		st      store.PlayerState
		wantTag bool
		credit  int64
	}{
		{
			name:    "first deposit",
			evt:     domain.Event{Type: domain.EventDeposit, Amount: 50},
			st:      store.PlayerState{OfferTags: nil},
			wantTag: true,
			credit:  100,
		},
		{
			name:    "repeat deposit",
			evt:     domain.Event{Type: domain.EventDeposit, Amount: 50},
			st:      store.PlayerState{OfferTags: []string{domain.OfferWelcomeBonus}},
			wantTag: true,
			credit:  0,
		},
		{
			name:    "non deposit",
			evt:     domain.Event{Type: domain.EventBetPlaced, Amount: 10},
			st:      store.PlayerState{},
			wantTag: false,
			credit:  0,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res := e.ApplyWelcome(tt.evt, tt.st)
			has := slices.Contains(res.State.OfferTags, domain.OfferWelcomeBonus)
			if has != tt.wantTag {
				t.Fatalf("tag=%v want %v", has, tt.wantTag)
			}
			if res.CreditAmount != tt.credit {
				t.Fatalf("credit=%d want %d", res.CreditAmount, tt.credit)
			}
		})
	}
}

func TestApplyVIP(t *testing.T) {
	e := New()
	tests := []struct {
		name     string
		score    int64
		amount   int64
		wantTier string
	}{
		{name: "bronze", score: 0, amount: 100, wantTier: domain.VIPBronze},
		{name: "silver", score: 900, amount: 200, wantTier: domain.VIPSilver},
		{name: "gold", score: 4800, amount: 300, wantTier: domain.VIPGold},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			in := Result{State: store.PlayerState{Score: tt.score, VIPTier: domain.VIPBronze}}
			res := e.ApplyVIP(domain.Event{Type: domain.EventBetPlaced, Amount: tt.amount}, in)
			if res.State.VIPTier != tt.wantTier {
				t.Fatalf("tier=%s want %s", res.State.VIPTier, tt.wantTier)
			}
		})
	}
}

func TestApplyIntegrity(t *testing.T) {
	e := New()
	in := Result{State: store.PlayerState{}}
	res := e.ApplyIntegrity(domain.Event{Type: domain.EventBetPlaced, Amount: 1}, in, VelocityBetLimit-1)
	if res.State.IntegrityFlag != domain.FlagVelocity {
		t.Fatalf("flag=%q want %q", res.State.IntegrityFlag, domain.FlagVelocity)
	}
	res = e.ApplyIntegrity(domain.Event{Type: domain.EventBetPlaced, Amount: 1}, in, 0)
	if res.State.IntegrityFlag != "" {
		t.Fatalf("unexpected flag %q", res.State.IntegrityFlag)
	}
}
