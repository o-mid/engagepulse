package ingest

import (
	"fmt"
	"strings"

	"github.com/o-mid/engagepulse/internal/domain"
)

func ValidateEvent(evt domain.Event) error {
	if strings.TrimSpace(evt.EventID) == "" {
		return fmt.Errorf("event_id is required")
	}
	if strings.TrimSpace(evt.TenantID) == "" {
		return fmt.Errorf("tenant_id is required")
	}
	if strings.TrimSpace(evt.PlayerID) == "" {
		return fmt.Errorf("player_id is required")
	}
	switch evt.Type {
	case domain.EventDeposit, domain.EventBetPlaced, domain.EventSessionHeartbeat:
	default:
		return fmt.Errorf("unsupported event type %q", evt.Type)
	}
	if evt.Type == domain.EventDeposit || evt.Type == domain.EventBetPlaced {
		if evt.Amount <= 0 {
			return fmt.Errorf("amount must be positive for %s", evt.Type)
		}
	}
	return nil
}
