package store

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

type Tenant struct {
	ID         string
	Name       string
	APIKey     string
	HMACSecret string
}

func (s *Store) GetTenant(ctx context.Context, id string) (Tenant, error) {
	var t Tenant
	err := s.pool.QueryRow(ctx, `
		SELECT id, name, api_key, hmac_secret
		FROM tenants WHERE id=$1
	`, id).Scan(&t.ID, &t.Name, &t.APIKey, &t.HMACSecret)
	if errors.Is(err, pgx.ErrNoRows) {
		return Tenant{}, ErrNotFound
	}
	return t, err
}

func (s *Store) GetTenantByAPIKey(ctx context.Context, apiKey string) (Tenant, error) {
	var t Tenant
	err := s.pool.QueryRow(ctx, `
		SELECT id, name, api_key, hmac_secret
		FROM tenants WHERE api_key=$1
	`, apiKey).Scan(&t.ID, &t.Name, &t.APIKey, &t.HMACSecret)
	if errors.Is(err, pgx.ErrNoRows) {
		return Tenant{}, ErrNotFound
	}
	return t, err
}

func (s *Store) EnsurePlayer(ctx context.Context, tenantID, playerID string) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO players (tenant_id, player_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, tenantID, playerID)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `
		INSERT INTO player_state (tenant_id, player_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, tenantID, playerID)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `
		INSERT INTO balances (tenant_id, player_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, tenantID, playerID)
	return err
}
