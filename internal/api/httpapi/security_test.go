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
	"github.com/o-mid/engagepulse/internal/store"
)

func TestIngestRejectsBadHMAC(t *testing.T) {
	st, srv := newSecurityTestServer(t)
	defer st.Close()
	defer srv.Close()

	body := depositBody(t, "acme-casino", "sec-player-hmac", "sec-evt-hmac")
	req, err := http.NewRequest(http.MethodPost, srv.URL+"/v1/events", bytes.NewReader(body))
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Signature", ingest.Sign("wrong-secret", body))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("do: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status=%d want 401", resp.StatusCode)
	}
}

func TestIngestRejectsUnknownTenant(t *testing.T) {
	st, srv := newSecurityTestServer(t)
	defer st.Close()
	defer srv.Close()

	body := depositBody(t, "no-such-tenant", "sec-player-tenant", "sec-evt-tenant")
	req, err := http.NewRequest(http.MethodPost, srv.URL+"/v1/events", bytes.NewReader(body))
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Signature", ingest.Sign("hmac_acme_dev_secret", body))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("do: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		b, _ := io.ReadAll(resp.Body)
		t.Fatalf("status=%d want 401 body=%s", resp.StatusCode, b)
	}
}

func TestGetPlayerHidesCrossTenant(t *testing.T) {
	st, srv := newSecurityTestServer(t)
	defer st.Close()
	defer srv.Close()

	ctx := context.Background()
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	playerID := "sec-cross-" + suffix
	if err := st.EnsurePlayer(ctx, "acme-casino", playerID); err != nil {
		t.Fatalf("ensure: %v", err)
	}

	req, err := http.NewRequest(http.MethodGet, srv.URL+"/v1/players/"+playerID, nil)
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	req.Header.Set("X-API-Key", "ak_nova_dev_001")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("do: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		b, _ := io.ReadAll(resp.Body)
		t.Fatalf("status=%d want 404 body=%s", resp.StatusCode, b)
	}
}

func newSecurityTestServer(t *testing.T) (*store.Store, *httptest.Server) {
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
	if err := st.Migrate(ctx); err != nil {
		st.Close()
		t.Fatalf("migrate: %v", err)
	}
	api := httpapi.New(st, st, slog.Default())
	return st, httptest.NewServer(api.Handler())
}

func depositBody(t *testing.T, tenantID, playerID, eventID string) []byte {
	t.Helper()
	evt := domain.Event{
		EventID:    eventID,
		TenantID:   tenantID,
		PlayerID:   playerID,
		Type:       domain.EventDeposit,
		Amount:     25,
		OccurredAt: time.Now().UTC(),
	}
	body, err := json.Marshal(evt)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	return body
}
