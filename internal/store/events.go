package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

var ErrDuplicateEvent = errors.New("duplicate event")

func (s *Store) MarkProcessed(ctx context.Context, tenantID, playerID, eventID, eventType string) error {
	return markProcessed(ctx, s.pool, tenantID, playerID, eventID, eventType)
}

func (s *Store) MarkProcessedTx(ctx context.Context, tx pgx.Tx, tenantID, playerID, eventID, eventType string) error {
	return markProcessed(ctx, tx, tenantID, playerID, eventID, eventType)
}

func markProcessed(ctx context.Context, q querier, tenantID, playerID, eventID, eventType string) error {
	_, err := q.Exec(ctx, `
		INSERT INTO processed_events (tenant_id, player_id, event_id, event_type)
		VALUES ($1, $2, $3, $4)
	`, tenantID, playerID, eventID, eventType)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return ErrDuplicateEvent
		}
		return err
	}
	return nil
}

func (s *Store) IsProcessed(ctx context.Context, tenantID, eventID string) (bool, error) {
	var exists bool
	err := s.pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM processed_events WHERE tenant_id=$1 AND event_id=$2
		)
	`, tenantID, eventID).Scan(&exists)
	return exists, err
}

func (s *Store) CountPlayerEventsSince(ctx context.Context, tenantID, playerID, eventType string, since time.Time) (int64, error) {
	return countPlayerEventsSince(ctx, s.pool, tenantID, playerID, eventType, since)
}

func (s *Store) CountPlayerEventsSinceTx(ctx context.Context, tx pgx.Tx, tenantID, playerID, eventType string, since time.Time) (int64, error) {
	return countPlayerEventsSince(ctx, tx, tenantID, playerID, eventType, since)
}

func countPlayerEventsSince(ctx context.Context, q querier, tenantID, playerID, eventType string, since time.Time) (int64, error) {
	var n int64
	err := q.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM processed_events
		WHERE tenant_id=$1
		  AND player_id=$2
		  AND event_type=$3
		  AND processed_at >= $4
	`, tenantID, playerID, eventType, since).Scan(&n)
	return n, err
}
