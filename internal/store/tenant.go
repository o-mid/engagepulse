package store

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type Tenant struct {
	ID             string
	Name           string
	APIKey         string
	HMACSecret     string
	HMACKeyID      string
	HMACPrevSecret string
	HMACPrevKeyID  string
	HMACPrevUntil  *time.Time
}

const tenantHMACCols = `id, name, api_key, hmac_secret, hmac_key_id, hmac_prev_secret, hmac_prev_key_id, hmac_prev_until`

func scanTenant(row pgx.Row) (Tenant, error) {
	var t Tenant
	err := row.Scan(
		&t.ID,
		&t.Name,
		&t.APIKey,
		&t.HMACSecret,
		&t.HMACKeyID,
		&t.HMACPrevSecret,
		&t.HMACPrevKeyID,
		&t.HMACPrevUntil,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return Tenant{}, ErrNotFound
	}
	return t, err
}

func (s *Store) GetTenant(ctx context.Context, id string) (Tenant, error) {
	return scanTenant(s.pool.QueryRow(ctx, `
		SELECT `+tenantHMACCols+`
		FROM tenants WHERE id=$1
	`, id))
}

func (s *Store) GetTenantByAPIKey(ctx context.Context, apiKey string) (Tenant, error) {
	return scanTenant(s.pool.QueryRow(ctx, `
		SELECT `+tenantHMACCols+`
		FROM tenants WHERE api_key=$1
	`, apiKey))
}

func (s *Store) RotateHMAC(ctx context.Context, tenantID, newSecret string, overlap time.Duration) (Tenant, error) {
	newSecret = strings.TrimSpace(newSecret)
	if newSecret == "" {
		return Tenant{}, fmt.Errorf("secret required")
	}
	if overlap <= 0 {
		overlap = time.Hour
	}
	cur, err := s.GetTenant(ctx, tenantID)
	if err != nil {
		return Tenant{}, err
	}
	until := time.Now().UTC().Add(overlap)
	nextID := nextHMACKeyID(cur.HMACKeyID)
	_, err = s.pool.Exec(ctx, `
		UPDATE tenants
		SET hmac_prev_secret = hmac_secret,
		    hmac_prev_key_id = hmac_key_id,
		    hmac_prev_until = $1,
		    hmac_secret = $2,
		    hmac_key_id = $3
		WHERE id = $4
	`, until, newSecret, nextID, tenantID)
	if err != nil {
		return Tenant{}, err
	}
	return s.GetTenant(ctx, tenantID)
}

func (s *Store) RestoreHMAC(ctx context.Context, tenantID, keyID, secret string) error {
	secret = strings.TrimSpace(secret)
	if secret == "" {
		return fmt.Errorf("secret required")
	}
	if strings.TrimSpace(keyID) == "" {
		keyID = "v1"
	}
	_, err := s.pool.Exec(ctx, `
		UPDATE tenants
		SET hmac_secret = $1,
		    hmac_key_id = $2,
		    hmac_prev_secret = '',
		    hmac_prev_key_id = '',
		    hmac_prev_until = NULL
		WHERE id = $3
	`, secret, keyID, tenantID)
	return err
}

func nextHMACKeyID(current string) string {
	var n int
	if _, err := fmt.Sscanf(strings.TrimSpace(current), "v%d", &n); err == nil && n > 0 {
		return fmt.Sprintf("v%d", n+1)
	}
	return "v2"
}

func (s *Store) EnsurePlayer(ctx context.Context, tenantID, playerID string) error {
	return ensurePlayer(ctx, s.pool, tenantID, playerID)
}
