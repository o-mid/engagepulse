package rules

import (
	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/store"
)

// Thresholds are deliberately small so a short loadgen/demo run can cross them.
const (
	VIPSilverThreshold int64 = 1000
	VIPGoldThreshold   int64 = 5000
	// VelocityBetLimit: bets in a ~1 minute window that trip the integrity flag.
	VelocityBetLimit int64 = 5
)

type Result struct {
	State        store.PlayerState
	CreditAmount int64
	CreditReason string
	RuleHits     []string
}

type Engine struct{}

func New() *Engine { return &Engine{} }

// Apply runs welcome → VIP → velocity in that fixed order.
func (e *Engine) Apply(evt domain.Event, st store.PlayerState, recentBets int64) Result {
	res := e.ApplyWelcome(evt, st)
	res = e.ApplyVIP(evt, res)
	res = e.ApplyIntegrity(evt, res, recentBets)
	return res
}

// ApplyWelcome: first deposit adds welcome_bonus and asks for +100 once.
func (e *Engine) ApplyWelcome(evt domain.Event, st store.PlayerState) Result {
	res := Result{State: st}
	if evt.Type != domain.EventDeposit {
		return res
	}
	if hasOffer(st.OfferTags, domain.OfferWelcomeBonus) {
		return res
	}
	st.OfferTags = withOffer(st.OfferTags, domain.OfferWelcomeBonus)
	res.State = st
	res.CreditAmount = 100
	res.CreditReason = "welcome_offer"
	res.RuleHits = append(res.RuleHits, "welcome_offer")
	return res
}

// ApplyVIP: each bet adds its amount to score, then maps score to bronze/silver/gold.
func (e *Engine) ApplyVIP(evt domain.Event, in Result) Result {
	st := in.State
	if evt.Type != domain.EventBetPlaced {
		return in
	}
	if evt.Amount > 0 {
		st.Score += evt.Amount
	}
	st.VIPTier = tierForScore(st.Score)
	in.State = st
	in.RuleHits = append(in.RuleHits, "vip_score")
	return in
}

// ApplyIntegrity: many bets in a short time → set velocity flag (warning only).
func (e *Engine) ApplyIntegrity(evt domain.Event, in Result, recentBets int64) Result {
	if evt.Type != domain.EventBetPlaced {
		return in
	}
	// recentBets = other bets in the last minute; +1 counts this bet too.
	if recentBets+1 < VelocityBetLimit {
		return in
	}
	st := in.State
	st.IntegrityFlag = domain.FlagVelocity
	in.State = st
	in.RuleHits = append(in.RuleHits, "integrity_velocity")
	return in
}

func tierForScore(score int64) string {
	switch {
	case score >= VIPGoldThreshold:
		return domain.VIPGold
	case score >= VIPSilverThreshold:
		return domain.VIPSilver
	default:
		return domain.VIPBronze
	}
}
