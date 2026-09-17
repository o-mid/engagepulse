package rulepatch

import (
	"context"
	"fmt"
	"strings"

	"github.com/o-mid/engagepulse/internal/rules"
)

type Proposer interface {
	Propose(ctx context.Context, request string, current rules.Thresholds) (Patch, error)
}

type Mock struct{}

func (Mock) Propose(_ context.Context, request string, current rules.Thresholds) (Patch, error) {
	next := current
	switch {
	case strings.Contains(strings.ToLower(request), "velocity"):
		next.VelocityBetLimit = current.VelocityBetLimit + 3
	case strings.Contains(strings.ToLower(request), "welcome"):
		next.WelcomeCredit = 50
	default:
		return Patch{}, fmt.Errorf("mock proposer: no rule change for %q", request)
	}
	return Patch{Thresholds: next, Diff: Diff(current, next)}, nil
}
