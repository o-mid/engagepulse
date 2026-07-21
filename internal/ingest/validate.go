package ingest

import (
	"fmt"
	"strings"

	"github.com/o-mid/engagepulse/internal/domain"
)

func ValidateEvent(evt domain.Event) error {
	if err := requireNonEmpty("event_id", evt.EventID); err != nil {
		return err
	}
	if err := requireNonEmpty("tenant_id", evt.TenantID); err != nil {
		return err
	}
	if err := requireNonEmpty("player_id", evt.PlayerID); err != nil {
		return err
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

func requireNonEmpty(field, value string) error {
	if strings.TrimSpace(value) == "" {
		return fmt.Errorf("%s is required", field)
	}
	return nil
}
