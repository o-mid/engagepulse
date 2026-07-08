package domain

import "time"

const (
	EventDeposit          = "deposit"
	EventBetPlaced        = "bet_placed"
	EventSessionHeartbeat = "session_heartbeat"
)

type Event struct {
	EventID    string    `json:"event_id"`
	TenantID   string    `json:"tenant_id"`
	PlayerID   string    `json:"player_id"`
	Type       string    `json:"type"`
	Amount     int64     `json:"amount,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}
