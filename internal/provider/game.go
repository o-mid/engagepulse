package provider

import "github.com/o-mid/engagepulse/internal/domain"

// GameProvider is the upstream activity source contract used by loadgen/ingest demos.
type GameProvider interface {
	NextEvents(tenantID string, n int) []domain.Event
}
