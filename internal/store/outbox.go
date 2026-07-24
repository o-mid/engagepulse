package store

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/o-mid/engagepulse/internal/domain"
)

const (
	OutboxPending    = "pending"
	OutboxPublishing = "publishing"
	OutboxPublished  = "published"
)

type OutboxRow struct {
	ID        int64
	TenantID  string
	PlayerID  string
	EventID   string
	Payload   []byte
	Status    string
	Attempts  int
	LastError string
	CreatedAt time.Time
}

func (s *Store) EnqueueEvent(ctx context.Context, evt domain.Event) error {
	payload, err := json.Marshal(evt)
	if err != nil {
		return err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if err := ensurePlayerTx(ctx, tx, evt.TenantID, evt.PlayerID); err != nil {
		return err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO outbox (tenant_id, player_id, event_id, payload, status)
		VALUES ($1, $2, $3, $4, $5)
	`, evt.TenantID, evt.PlayerID, evt.EventID, payload, OutboxPending)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return ErrDuplicateEvent
		}
		return err
	}
	return tx.Commit(ctx)
}

func ensurePlayerTx(ctx context.Context, tx pgx.Tx, tenantID, playerID string) error {
	if _, err := tx.Exec(ctx, `
		INSERT INTO players (tenant_id, player_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, tenantID, playerID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO player_state (tenant_id, player_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, tenantID, playerID); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, `
		INSERT INTO balances (tenant_id, player_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, tenantID, playerID)
	return err
}

// ReclaimPublishingOutbox returns rows left in publishing after a crash back to pending.
// Safe with a single in-process publisher.
func (s *Store) ReclaimPublishingOutbox(ctx context.Context) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE outbox
		SET status = $1, last_error = 'reclaimed stale publish'
		WHERE status = $2
	`, OutboxPending, OutboxPublishing)
	return err
}

func (s *Store) ClaimPendingOutbox(ctx context.Context, limit int) ([]OutboxRow, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	rows, err := tx.Query(ctx, `
		UPDATE outbox
		SET status = $2, attempts = attempts + 1
		WHERE id IN (
			SELECT id FROM outbox
			WHERE status = $1
			ORDER BY id
			LIMIT $3
			FOR UPDATE SKIP LOCKED
		)
		RETURNING id, tenant_id, player_id, event_id, payload, status, attempts, last_error, created_at
	`, OutboxPending, OutboxPublishing, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []OutboxRow
	for rows.Next() {
		var r OutboxRow
		if err := rows.Scan(
			&r.ID, &r.TenantID, &r.PlayerID, &r.EventID, &r.Payload,
			&r.Status, &r.Attempts, &r.LastError, &r.CreatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return out, nil
}

func (s *Store) MarkOutboxPublished(ctx context.Context, id int64) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE outbox
		SET status = $2, published_at = now(), last_error = ''
		WHERE id = $1
	`, id, OutboxPublished)
	return err
}

func (s *Store) MarkOutboxPublishFailed(ctx context.Context, id int64, publishErr error) error {
	msg := ""
	if publishErr != nil {
		msg = publishErr.Error()
	}
	_, err := s.pool.Exec(ctx, `
		UPDATE outbox
		SET status = $2, last_error = $3
		WHERE id = $1
	`, id, OutboxPending, msg)
	return err
}

func (s *Store) GetOutbox(ctx context.Context, tenantID, eventID string) (OutboxRow, error) {
	var r OutboxRow
	err := s.pool.QueryRow(ctx, `
		SELECT id, tenant_id, player_id, event_id, payload, status, attempts, last_error, created_at
		FROM outbox
		WHERE tenant_id = $1 AND event_id = $2
	`, tenantID, eventID).Scan(
		&r.ID, &r.TenantID, &r.PlayerID, &r.EventID, &r.Payload,
		&r.Status, &r.Attempts, &r.LastError, &r.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return OutboxRow{}, ErrNotFound
	}
	return r, err
}

func (s *Store) CountOutbox(ctx context.Context, tenantID, eventID string) (int64, error) {
	var n int64
	err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM outbox WHERE tenant_id = $1 AND event_id = $2
	`, tenantID, eventID).Scan(&n)
	return n, err
}
