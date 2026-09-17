package shadow

import (
	"context"
	"fmt"

	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/rules"
)

type Scorer interface {
	Score(ctx context.Context, events []domain.Event) (Decision, error)
}

type Decision struct {
	Reason string
	Flag   bool
}

type Mock struct{}

func (Mock) Score(_ context.Context, events []domain.Event) (Decision, error) {
	var n int64
	for _, evt := range events {
		if evt.Type == domain.EventBetPlaced {
			n++
		}
	}
	return Decision{
		Flag:   n >= rules.VelocityBetLimit,
		Reason: fmt.Sprintf("pack bets=%d limit=%d", n, rules.VelocityBetLimit),
	}, nil
}
