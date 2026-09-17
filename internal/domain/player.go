package domain

import "time"

const (
	VIPBronze = "bronze"
	VIPSilver = "silver"
	VIPGold   = "gold"

	OfferWelcomeBonus = "welcome_bonus"
	FlagVelocity      = "velocity"
)

type PlayerSnapshot struct {
	UpdatedAt     time.Time `json:"updated_at"`
	TenantID      string    `json:"tenant_id"`
	PlayerID      string    `json:"player_id"`
	VIPTier       string    `json:"vip_tier"`
	IntegrityFlag string    `json:"integrity_flag"`
	OfferTags     []string  `json:"offer_tags"`
	Score         int64     `json:"score"`
	Balance       int64     `json:"balance"`
}
