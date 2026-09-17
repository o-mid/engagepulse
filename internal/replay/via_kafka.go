package replay

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"time"

	"github.com/o-mid/engagepulse/internal/api/httpapi"
	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/ingest"
	"github.com/o-mid/engagepulse/internal/kafka"
	"github.com/o-mid/engagepulse/internal/outbox"
	"github.com/o-mid/engagepulse/internal/store"
	"github.com/o-mid/engagepulse/internal/worker"
)

func RunViaKafka(ctx context.Context, st *store.Store, w *worker.Worker, brokers []string) (Report, error) {
	var report Report
	if st == nil || w == nil {
		return report, fmt.Errorf("store and worker required")
	}
	if len(brokers) == 0 {
		return report, fmt.Errorf("kafka brokers required")
	}

	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	topic := "player.events.replay-" + suffix
	dlqTopic := "player.events.dlq.replay-" + suffix
	if err := kafka.EnsureTopic(brokers, topic); err != nil {
		return report, err
	}
	if err := kafka.EnsureTopic(brokers, dlqTopic); err != nil {
		return report, err
	}

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	api := httpapi.New(st, st, logger)
	srv := httptest.NewServer(api.Handler())
	defer srv.Close()

	pub := kafka.NewProducer(brokers, topic)
	defer func() { _ = pub.Close() }()
	dlq := kafka.NewProducer(brokers, dlqTopic)
	defer func() { _ = dlq.Close() }()

	consumer := kafka.NewConsumer(
		brokers,
		topic,
		"engagepulse-replay-"+suffix,
		logger,
		w.Handle,
		dlq,
	).WithRetry(kafka.MaxAttempts, time.Millisecond)
	defer func() { _ = consumer.Close() }()

	runCtx, cancel := context.WithCancel(ctx)
	defer cancel()
	go func() { _ = consumer.Run(runCtx) }()

	op := outbox.NewPublisher(st, pub, logger)

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
		var tenant store.Tenant
		tenant, err = st.GetTenant(ctx, want.TenantID)
		if err != nil {
			return report, fmt.Errorf("%s tenant: %w", brand, err)
		}
		if err = ingestAll(ctx, srv.URL, tenant, events); err != nil {
			return report, err
		}
		if err = waitPublished(ctx, st, op, events); err != nil {
			return report, err
		}
		_, err = waitMatch(ctx, st, want)
		if err != nil {
			return report, fmt.Errorf("%s after kafka: %w", brand, err)
		}
		if err = ingestAll(ctx, srv.URL, tenant, events); err != nil {
			return report, err
		}
		if err = waitPublished(ctx, st, op, events); err != nil {
			return report, err
		}
		var got domain.PlayerSnapshot
		got, err = waitMatch(ctx, st, want)
		if err != nil {
			return report, fmt.Errorf("%s after second ingest: %w", brand, err)
		}
		report.Results = append(report.Results, BrandResult{
			Brand: brand,
			Pass:  Match(got, want),
			Got:   got,
			Want:  want,
		})
	}
	cancel()
	return report, nil
}

func ingestAll(ctx context.Context, baseURL string, tenant store.Tenant, events []domain.Event) error {
	for _, evt := range events {
		if err := postSignedEvent(ctx, baseURL, tenant, evt); err != nil {
			return err
		}
	}
	return nil
}

func postSignedEvent(ctx context.Context, baseURL string, tenant store.Tenant, evt domain.Event) error {
	body, err := json.Marshal(evt)
	if err != nil {
		return err
	}
	var req *http.Request
	req, err = http.NewRequestWithContext(ctx, http.MethodPost, baseURL+"/v1/events", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Signature", ingest.Sign(tenant.HMACSecret, body))
	if strings.TrimSpace(tenant.HMACKeyID) != "" {
		req.Header.Set(ingest.HeaderKeyID, tenant.HMACKeyID)
	}
	var resp *http.Response
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusAccepted {
		return fmt.Errorf("ingest %s status=%d", evt.EventID, resp.StatusCode)
	}
	return nil
}

func waitPublished(ctx context.Context, st *store.Store, op *outbox.Publisher, events []domain.Event) error {
	deadline := time.Now().Add(20 * time.Second)
	for _, evt := range events {
		for {
			if err := op.FlushOnce(ctx); err != nil {
				return err
			}
			row, err := st.GetOutbox(ctx, evt.TenantID, evt.EventID)
			if err != nil {
				return fmt.Errorf("outbox %s: %w", evt.EventID, err)
			}
			if row.Status == store.OutboxPublished {
				break
			}
			if time.Now().After(deadline) {
				return fmt.Errorf("outbox %s status=%s err=%q", evt.EventID, row.Status, row.LastError)
			}
			time.Sleep(50 * time.Millisecond)
		}
	}
	return nil
}

func waitMatch(ctx context.Context, st *store.Store, want domain.PlayerSnapshot) (domain.PlayerSnapshot, error) {
	deadline := time.Now().Add(20 * time.Second)
	var last domain.PlayerSnapshot
	for {
		got, err := st.GetPlayerSnapshot(ctx, want.TenantID, want.PlayerID)
		if err == nil {
			last = got
			if Match(got, want) {
				return got, nil
			}
		}
		if time.Now().After(deadline) {
			if err != nil {
				return domain.PlayerSnapshot{}, fmt.Errorf("snapshot %s/%s: %w", want.TenantID, want.PlayerID, err)
			}
			return last, fmt.Errorf("snapshot drift got=%+v want=%+v", ContractOf(last), ContractOf(want))
		}
		select {
		case <-ctx.Done():
			return domain.PlayerSnapshot{}, ctx.Err()
		case <-time.After(50 * time.Millisecond):
		}
	}
}
