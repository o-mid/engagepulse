package domain

import "time"

const (
	EventDeposit          = "deposit"
	EventBetPlaced        = "bet_placed"
	EventSessionHeartbeat = "session_heartbeat"
	EventSchemaV1         = 1
)

type Event struct {
	OccurredAt    time.Time `json:"occurred_at"`
	EventID       string    `json:"event_id"`
	TenantID      string    `json:"tenant_id"`
	PlayerID      string    `json:"player_id"`
	Type          string    `json:"type"`
	TraceID       string    `json:"trace_id,omitempty"`
	Amount        int64     `json:"amount,omitempty"`
	SchemaVersion int       `json:"schema_version,omitempty"`
}
