package rules

import (
	"slices"

	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/store"
)

type Result struct {
	State        store.PlayerState
	CreditAmount int64
	CreditReason string
	RuleHits     []string
}

type Engine struct{}

func New() *Engine { return &Engine{} }

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
