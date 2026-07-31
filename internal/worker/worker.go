package worker

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/ledger"
	"github.com/o-mid/engagepulse/internal/metrics"
	"github.com/o-mid/engagepulse/internal/rules"
	"github.com/o-mid/engagepulse/internal/store"
)

type Worker struct {
	store  *store.Store
	ledger *ledger.Ledger
	rules  *rules.Engine
	logger *slog.Logger

	// failAfterMark aborts the tx after the processed-event insert (tests).
	failAfterMark error
}

func New(st *store.Store, logger *slog.Logger) *Worker {
	return &Worker{
		store:  st,
		ledger: ledger.New(st.Pool()),
		rules:  rules.New(),
		logger: logger,
	}
}

func (w *Worker) Handle(ctx context.Context, evt domain.Event) error {
	var (
		ruleHits     []string
		creditAmount int64
		credited     bool
	)

	err := w.store.WithTx(ctx, func(tx pgx.Tx) error {
		if err := store.EnsurePlayerTx(ctx, tx, evt.TenantID, evt.PlayerID); err != nil {
			return err
		}

		// Mark first so a partial failure rolls back with the rest of the write set.
		err := w.store.MarkProcessedTx(ctx, tx, evt.TenantID, evt.PlayerID, evt.EventID, evt.Type)
		if errors.Is(err, store.ErrDuplicateEvent) {
			return store.ErrDuplicateEvent
		}
		if err != nil {
			return err
		}
		if w.failAfterMark != nil {
			return w.failAfterMark
		}

		st, err := w.store.GetPlayerStateTx(ctx, tx, evt.TenantID, evt.PlayerID)
		if err != nil {
			return err
		}

		recentBets, err := w.store.CountPlayerEventsSinceTx(ctx, tx, evt.TenantID, evt.PlayerID, domain.EventBetPlaced, time.Now().UTC().Add(-1*time.Minute))
		if err != nil {
			return err
		}
		// Count includes this bet (just marked processed); rules expect "others in window".
		if evt.Type == domain.EventBetPlaced && recentBets > 0 {
			recentBets--
		}

		res := w.rules.Apply(evt, st, recentBets)
		if err := w.store.SavePlayerStateTx(ctx, tx, res.State); err != nil {
			return err
		}

		if res.CreditAmount > 0 {
			err := w.ledger.CreditTx(ctx, tx, evt.TenantID, evt.PlayerID, evt.EventID, res.CreditReason, res.CreditAmount)
			if errors.Is(err, ledger.ErrDuplicateCredit) {
				w.logger.Info("skip duplicate credit", "event_id", evt.EventID)
			} else if err != nil {
				return err
			} else {
				credited = true
			}
		}

		ruleHits = res.RuleHits
		creditAmount = res.CreditAmount
		return nil
	})
	if errors.Is(err, store.ErrDuplicateEvent) {
		w.logger.Info("skip duplicate event", "event_id", evt.EventID, "tenant_id", evt.TenantID)
		return nil
	}
	if err != nil {
		return err
	}

	if credited {
		metrics.LedgerCredits.Inc()
	}
	for _, hit := range ruleHits {
		metrics.RuleHits.WithLabelValues(hit).Inc()
	}
	metrics.EventsProcessed.Inc()

	w.logger.Info("event processed",
		"event_id", evt.EventID,
		"tenant_id", evt.TenantID,
		"player_id", evt.PlayerID,
		"type", evt.Type,
		"rule_hits", ruleHits,
		"credit", creditAmount,
	)
	return nil
}
