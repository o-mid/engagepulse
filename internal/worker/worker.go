package worker

import (
	"context"
	"errors"
	"log/slog"
	"time"

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
	if err := w.store.EnsurePlayer(ctx, evt.TenantID, evt.PlayerID); err != nil {
		return err
	}

	// Remember this event id so a replay does not run the rules again.
	err := w.store.MarkProcessed(ctx, evt.TenantID, evt.PlayerID, evt.EventID, evt.Type)
	if errors.Is(err, store.ErrDuplicateEvent) {
		w.logger.Info("skip duplicate event", "event_id", evt.EventID, "tenant_id", evt.TenantID)
		return nil
	}
	if err != nil {
		return err
	}

	st, err := w.store.GetPlayerState(ctx, evt.TenantID, evt.PlayerID)
	if err != nil {
		return err
	}

	recentBets, err := w.store.CountPlayerEventsSince(ctx, evt.TenantID, evt.PlayerID, domain.EventBetPlaced, time.Now().UTC().Add(-1*time.Minute))
	if err != nil {
		return err
	}
	// Count includes this bet (just marked processed); rules expect "others in window".
	if evt.Type == domain.EventBetPlaced && recentBets > 0 {
		recentBets--
	}

	res := w.rules.Apply(evt, st, recentBets)
	if err := w.store.SavePlayerState(ctx, res.State); err != nil {
		return err
	}

	if res.CreditAmount > 0 {
		// Extra safety: same event id cannot add the bonus twice in the ledger.
		err := w.ledger.Credit(ctx, evt.TenantID, evt.PlayerID, evt.EventID, res.CreditReason, res.CreditAmount)
		if errors.Is(err, ledger.ErrDuplicateCredit) {
			w.logger.Info("skip duplicate credit", "event_id", evt.EventID)
		} else if err != nil {
			return err
		} else {
			metrics.LedgerCredits.Inc()
		}
	}

	for _, hit := range res.RuleHits {
		metrics.RuleHits.WithLabelValues(hit).Inc()
	}
	metrics.EventsProcessed.Inc()

	w.logger.Info("event processed",
		"event_id", evt.EventID,
		"tenant_id", evt.TenantID,
		"player_id", evt.PlayerID,
		"type", evt.Type,
		"rule_hits", res.RuleHits,
		"credit", res.CreditAmount,
	)
	return nil
}
