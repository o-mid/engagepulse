package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/o-mid/engagepulse/internal/domain"
)

type PlayerState struct {
	TenantID      string
	PlayerID      string
	Score         int64
	VIPTier       string
	OfferTags     []string
	IntegrityFlag string
	UpdatedAt     time.Time
}

func (s *Store) GetPlayerState(ctx context.Context, tenantID, playerID string) (PlayerState, error) {
	var st PlayerState
	err := s.pool.QueryRow(ctx, `
		SELECT tenant_id, player_id, score, vip_tier, offer_tags, integrity_flag, updated_at
		FROM player_state
		WHERE tenant_id=$1 AND player_id=$2
	`, tenantID, playerID).Scan(
		&st.TenantID, &st.PlayerID, &st.Score, &st.VIPTier, &st.OfferTags, &st.IntegrityFlag, &st.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return PlayerState{}, ErrNotFound
	}
	return st, err
}

func (s *Store) GetBalance(ctx context.Context, tenantID, playerID string) (int64, error) {
	var amount int64
	err := s.pool.QueryRow(ctx, `
		SELECT amount FROM balances WHERE tenant_id=$1 AND player_id=$2
	`, tenantID, playerID).Scan(&amount)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrNotFound
	}
	return amount, err
}

func (s *Store) GetPlayerSnapshot(ctx context.Context, tenantID, playerID string) (domain.PlayerSnapshot, error) {
	st, err := s.GetPlayerState(ctx, tenantID, playerID)
	if err != nil {
		return domain.PlayerSnapshot{}, err
	}
	bal, err := s.GetBalance(ctx, tenantID, playerID)
	if err != nil {
		return domain.PlayerSnapshot{}, err
	}
	return domain.PlayerSnapshot{
		TenantID:      st.TenantID,
		PlayerID:      st.PlayerID,
		Score:         st.Score,
		VIPTier:       st.VIPTier,
		OfferTags:     st.OfferTags,
		IntegrityFlag: st.IntegrityFlag,
		Balance:       bal,
		UpdatedAt:     st.UpdatedAt,
	}, nil
}

func (s *Store) SavePlayerState(ctx context.Context, st PlayerState) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE player_state
		SET score=$3, vip_tier=$4, offer_tags=$5, integrity_flag=$6, updated_at=now()
		WHERE tenant_id=$1 AND player_id=$2
	`, st.TenantID, st.PlayerID, st.Score, st.VIPTier, st.OfferTags, st.IntegrityFlag)
	return err
}

func (s *Store) CountEventsByTypeSince(ctx context.Context, tenantID, playerID, eventType string, since time.Time) (int64, error) {
	var n int64
	err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM processed_events pe
		WHERE pe.tenant_id=$1
		  AND pe.event_type=$2
		  AND pe.processed_at >= $3
		  AND EXISTS (
			SELECT 1 FROM players p
			WHERE p.tenant_id=pe.tenant_id AND p.player_id=$4
		  )
	`, tenantID, eventType, since, playerID).Scan(&n)
	return n, err
}
