package shadow

import (
	"time"

	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/rules"
	"github.com/o-mid/engagepulse/internal/store"
)

func RuleWouldFlag(events []domain.Event, limit int64) bool {
	eng := rules.Engine{T: rules.Thresholds{VelocityBetLimit: limit}}
	in := rules.Result{State: store.PlayerState{}}
	var prior []time.Time
	for _, evt := range events {
		if evt.Type != domain.EventBetPlaced {
			continue
		}
		var recent int64
		for _, t := range prior {
			if evt.OccurredAt.Sub(t) <= time.Minute {
				recent++
			}
		}
		in = eng.ApplyIntegrity(evt, in, recent)
		if in.State.IntegrityFlag == domain.FlagVelocity {
			return true
		}
		prior = append(prior, evt.OccurredAt)
	}
	return false
}
