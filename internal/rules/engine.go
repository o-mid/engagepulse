package rules

import (
	"slices"

	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/store"
)

const (
	VIPSilverThreshold int64 = 1000
	VIPGoldThreshold   int64 = 5000
	VelocityBetLimit   int64 = 5
)

type Result struct {
	State        store.PlayerState
	CreditAmount int64
	CreditReason string
	RuleHits     []string
}

type Engine struct{}

func New() *Engine { return &Engine{} }

func (e *Engine) Apply(evt domain.Event, st store.PlayerState, recentBets int64) Result {
	res := e.ApplyWelcome(evt, st)
	res = e.ApplyVIP(evt, res)
	res = e.ApplyIntegrity(evt, res, recentBets)
	return res
}

func (e *Engine) ApplyWelcome(evt domain.Event, st store.PlayerState) Result {
	res := Result{State: st}
	if evt.Type != domain.EventDeposit {
		return res
	}
	if slices.Contains(st.OfferTags, domain.OfferWelcomeBonus) {
		return res
	}
	st.OfferTags = append(append([]string{}, st.OfferTags...), domain.OfferWelcomeBonus)
	res.State = st
	res.CreditAmount = 100
	res.CreditReason = "welcome_offer"
	res.RuleHits = append(res.RuleHits, "welcome_offer")
	return res
}

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

func (e *Engine) ApplyIntegrity(evt domain.Event, in Result, recentBets int64) Result {
	if evt.Type != domain.EventBetPlaced {
		return in
	}
	// recentBets is count before this event; include current bet.
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
