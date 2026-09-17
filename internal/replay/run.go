package replay

import (
	"context"
	"fmt"
	"slices"
	"time"

	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/store"
	"github.com/o-mid/engagepulse/internal/worker"
)

type BrandResult struct {
	Brand string
	Got   domain.PlayerSnapshot
	Want  domain.PlayerSnapshot
	Pass  bool
}

type Report struct {
	Results []BrandResult
}

func (r Report) AllPass() bool {
	for _, br := range r.Results {
		if !br.Pass {
			return false
		}
	}
	return len(r.Results) > 0
}

type Contract struct {
	TenantID      string
	PlayerID      string
	VIPTier       string
	IntegrityFlag string
	OfferTags     []string
	Score         int64
	Balance       int64
}

func ContractOf(s domain.PlayerSnapshot) Contract {
	return Contract{
		TenantID:      s.TenantID,
		PlayerID:      s.PlayerID,
		Score:         s.Score,
		VIPTier:       s.VIPTier,
		OfferTags:     s.OfferTags,
		IntegrityFlag: s.IntegrityFlag,
		Balance:       s.Balance,
	}
}

func Match(got, want domain.PlayerSnapshot) bool {
	return got.TenantID == want.TenantID &&
		got.PlayerID == want.PlayerID &&
		got.Score == want.Score &&
		got.VIPTier == want.VIPTier &&
		slices.Equal(got.OfferTags, want.OfferTags) &&
		got.IntegrityFlag == want.IntegrityFlag &&
		got.Balance == want.Balance
}

func Run(ctx context.Context, st *store.Store, w *worker.Worker) (Report, error) {
	var report Report
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	for _, brand := range Brands {
		events, want, err := LoadBrand(brand)
		if err != nil {
			return report, err
		}
		want.PlayerID = want.PlayerID + "-" + suffix
		for i := range events {
			events[i].PlayerID = events[i].PlayerID + "-" + suffix
			events[i].EventID = events[i].EventID + "-" + suffix
		}
		if err = apply(ctx, w, events); err != nil {
			return report, err
		}
		if err = apply(ctx, w, events); err != nil {
			return report, err
		}
		got, err := st.GetPlayerSnapshot(ctx, want.TenantID, want.PlayerID)
		if err != nil {
			return report, fmt.Errorf("%s snapshot: %w", brand, err)
		}
		report.Results = append(report.Results, BrandResult{
			Brand: brand,
			Pass:  Match(got, want),
			Got:   got,
			Want:  want,
		})
	}
	return report, nil
}

func apply(ctx context.Context, w *worker.Worker, events []domain.Event) error {
	for _, evt := range events {
		if err := w.Handle(ctx, evt); err != nil {
			return fmt.Errorf("handle %s: %w", evt.EventID, err)
		}
	}
	return nil
}
