package httpapi_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/o-mid/engagepulse/internal/api/httpapi"
	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/ingest"
	"github.com/o-mid/engagepulse/internal/kafka"
	"github.com/o-mid/engagepulse/internal/store"
	"github.com/o-mid/engagepulse/internal/worker"
)

type memDLQList struct {
	items []kafka.DeadLetter
}

func (m memDLQList) Recent(_ context.Context, n int) ([]kafka.DeadLetter, error) {
	if n > len(m.items) {
		n = len(m.items)
	}
	return m.items[:n], nil
}

func TestListDLQRequiresAPIKey(t *testing.T) {
	st, srv := newSecurityTestServer(t)
	defer st.Close()
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/v1/dlq")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status=%d want 401", resp.StatusCode)
	}
}

func TestListDLQHidesOtherTenant(t *testing.T) {
	st, api, srv := newDLQTestServer(t)
	defer st.Close()
	defer srv.Close()

	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	api.SetDLQ(memDLQList{items: []kafka.DeadLetter{
		{
			FailedAt: time.Now().UTC(),
			Error:    "injected",
			Attempts: 3,
			Event: domain.Event{
				EventID:  "acme-dlq-" + suffix,
				TenantID: "acme-casino",
				PlayerID: "p-acme",
				Type:     domain.EventDeposit,
				Amount:   50,
			},
		},
		{
			FailedAt: time.Now().UTC(),
			Error:    "injected",
			Attempts: 3,
			Event: domain.Event{
				EventID:  "nova-dlq-" + suffix,
				TenantID: "nova-sports",
				PlayerID: "p-nova",
				Type:     domain.EventDeposit,
				Amount:   50,
			},
		},
	}})

	req, err := http.NewRequest(http.MethodGet, srv.URL+"/v1/dlq?n=20", nil)
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	req.Header.Set("X-API-Key", "ak_acme_dev_001")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("do: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("status=%d body=%s", resp.StatusCode, body)
	}
	var out struct {
		Items []kafka.DeadLetter `json:"items"`
	}
	if err = json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(out.Items) != 1 || out.Items[0].Event.EventID != "acme-dlq-"+suffix {
		t.Fatalf("items=%+v", out.Items)
	}
}

func TestRedriveSignedIngestIsCreditOnce(t *testing.T) {
	st, api, srv := newDLQTestServer(t)
	defer st.Close()
	defer srv.Close()

	ctx := context.Background()
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	playerID := "redrive-" + suffix
	eventID := "redrive-evt-" + suffix
	evt := domain.Event{
		EventID:    eventID,
		TenantID:   "acme-casino",
		PlayerID:   playerID,
		Type:       domain.EventDeposit,
		Amount:     50,
		OccurredAt: time.Now().UTC(),
	}
	api.SetDLQ(memDLQList{items: []kafka.DeadLetter{{
		FailedAt: time.Now().UTC(),
		Error:    "injected",
		Attempts: 3,
		Event:    evt,
	}}})

	req, err := http.NewRequest(http.MethodGet, srv.URL+"/v1/dlq", nil)
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	req.Header.Set("X-API-Key", "ak_acme_dev_001")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	_ = resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("list status=%d", resp.StatusCode)
	}

	tenant, err := st.GetTenant(ctx, "acme-casino")
	if err != nil {
		t.Fatalf("tenant: %v", err)
	}
	w := worker.New(st, slog.New(slog.NewTextHandler(io.Discard, nil)))

	status := postSignedEvent(t, srv.URL, tenant.HMACSecret, evt)
	if status != http.StatusAccepted {
		t.Fatalf("redrive status=%d", status)
	}
	if err = w.Handle(ctx, evt); err != nil {
		t.Fatalf("handle: %v", err)
	}
	snap, err := st.GetPlayerSnapshot(ctx, "acme-casino", playerID)
	if err != nil {
		t.Fatalf("snapshot: %v", err)
	}
	if snap.Balance <= 0 {
		t.Fatalf("first redrive balance=%d", snap.Balance)
	}
	first := snap.Balance

	status = postSignedEvent(t, srv.URL, tenant.HMACSecret, evt)
	if status != http.StatusAccepted {
		t.Fatalf("second ingest status=%d", status)
	}
	if err = w.Handle(ctx, evt); err != nil {
		t.Fatalf("handle again: %v", err)
	}
	snap, err = st.GetPlayerSnapshot(ctx, "acme-casino", playerID)
	if err != nil {
		t.Fatalf("snapshot: %v", err)
	}
	if snap.Balance != first {
		t.Fatalf("second redrive balance=%d want %d", snap.Balance, first)
	}
}

func newDLQTestServer(t *testing.T) (*store.Store, *httpapi.Server, *httptest.Server) {
	t.Helper()
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL not set")
	}
	ctx := context.Background()
	st, err := store.Open(ctx, dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	if err = st.Migrate(ctx); err != nil {
		st.Close()
		t.Fatalf("migrate: %v", err)
	}
	api := httpapi.New(st, st, slog.New(slog.NewTextHandler(io.Discard, nil)))
	return st, api, httptest.NewServer(api.Handler())
}

func postSignedEvent(t *testing.T, base, secret string, evt domain.Event) int {
	t.Helper()
	body, err := json.Marshal(evt)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	req, err := http.NewRequest(http.MethodPost, base+"/v1/events", bytes.NewReader(body))
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Signature", ingest.Sign(secret, body))
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("do: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	return resp.StatusCode
}
