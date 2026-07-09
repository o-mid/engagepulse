package store

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
)

var ErrDuplicateEvent = errors.New("duplicate event")

func (s *Store) MarkProcessed(ctx context.Context, tenantID, eventID, eventType string) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO processed_events (tenant_id, event_id, event_type)
		VALUES ($1, $2, $3)
	`, tenantID, eventID, eventType)
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
