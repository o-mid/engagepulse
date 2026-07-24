package ledger

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrDuplicateCredit = errors.New("duplicate ledger credit")

type Ledger struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Ledger {
	return &Ledger{pool: pool}
}

// Credit adds reward once per brand+event. Second time is ignored as already paid.
func (l *Ledger) Credit(ctx context.Context, tenantID, playerID, eventID, reason string, amount int64) error {
	if amount == 0 {
		return nil
	}
	tx, err := l.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	_, err = tx.Exec(ctx, `
		INSERT INTO ledger_entries (tenant_id, player_id, event_id, amount, reason)
		VALUES ($1, $2, $3, $4, $5)
	`, tenantID, playerID, eventID, amount, reason)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return ErrDuplicateCredit
		}
		return err
	}

	ct, err := tx.Exec(ctx, `
		UPDATE balances
		SET amount = amount + $3, updated_at = now()
		WHERE tenant_id=$1 AND player_id=$2
	`, tenantID, playerID, amount)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("balance row missing")
	}

	return tx.Commit(ctx)
}

func (l *Ledger) Balance(ctx context.Context, tenantID, playerID string) (int64, error) {
	var amount int64
	err := l.pool.QueryRow(ctx, `
		SELECT amount FROM balances WHERE tenant_id=$1 AND player_id=$2
	`, tenantID, playerID).Scan(&amount)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, err
	}
	return amount, err
}
