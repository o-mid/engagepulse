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
	return ensurePlayer(ctx, s.pool, tenantID, playerID)
}
