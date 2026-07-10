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
	TenantID      string    `json:"tenant_id"`
	PlayerID      string    `json:"player_id"`
	Score         int64     `json:"score"`
	VIPTier       string    `json:"vip_tier"`
	OfferTags     []string  `json:"offer_tags"`
	IntegrityFlag string    `json:"integrity_flag"`
	Balance       int64     `json:"balance"`
	UpdatedAt     time.Time `json:"updated_at"`
}
