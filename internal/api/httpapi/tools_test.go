package httpapi_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/ingest"
	"github.com/o-mid/engagepulse/internal/store"
)

func TestToolIngestAccepted(t *testing.T) {
	st, srv := newSecurityTestServer(t)
	defer st.Close()
	defer srv.Close()

	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	playerID := "tool-ingest-" + suffix
	eventID := "tool-evt-" + suffix
	body := depositBody(t, "acme-casino", playerID, eventID)

	req, err := http.NewRequest(http.MethodPost, srv.URL+"/v1/tools/ingest", bytes.NewReader(body))
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", "ak_acme_dev_001")
	req.Header.Set("X-Signature", ingest.Sign("hmac_acme_dev_secret", body))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("do: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusAccepted {
		b, _ := io.ReadAll(resp.Body)
		t.Fatalf("status=%d want 202 body=%s", resp.StatusCode, b)
	}

	row, err := st.GetOutbox(context.Background(), "acme-casino", eventID)
	if err != nil {
		t.Fatalf("outbox: %v", err)
	}
	if row.EventID != eventID {
		t.Fatalf("outbox event_id=%s", row.EventID)
	}
}

func TestToolGetPlayer(t *testing.T) {
	st, srv := newSecurityTestServer(t)
	defer st.Close()
	defer srv.Close()

	ctx := context.Background()
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	playerID := "tool-player-" + suffix
	if err := st.EnsurePlayer(ctx, "acme-casino", playerID); err != nil {
		t.Fatalf("ensure: %v", err)
	}

	args, err := json.Marshal(map[string]string{"player_id": playerID})
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	req, err := http.NewRequest(http.MethodPost, srv.URL+"/v1/tools/get_player", bytes.NewReader(args))
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", "ak_acme_dev_001")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("do: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		t.Fatalf("status=%d want 200 body=%s", resp.StatusCode, b)
	}
	var snap domain.PlayerSnapshot
	if err := json.NewDecoder(resp.Body).Decode(&snap); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if snap.PlayerID != playerID || snap.TenantID != "acme-casino" {
		t.Fatalf("snapshot=%+v", snap)
	}
}

func TestToolIngestRejectsCrossTenant(t *testing.T) {
	st, srv := newSecurityTestServer(t)
	defer st.Close()
	defer srv.Close()

	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	body := depositBody(t, "acme-casino", "tool-x-"+suffix, "tool-xevt-"+suffix)

	req, err := http.NewRequest(http.MethodPost, srv.URL+"/v1/tools/ingest", bytes.NewReader(body))
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", "ak_nova_dev_001")
	req.Header.Set("X-Signature", ingest.Sign("hmac_acme_dev_secret", body))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("do: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusUnauthorized {
		b, _ := io.ReadAll(resp.Body)
		t.Fatalf("status=%d want 401 body=%s", resp.StatusCode, b)
	}

	_, err = st.GetOutbox(context.Background(), "acme-casino", "tool-xevt-"+suffix)
	if err == nil {
		t.Fatal("outbox row should not exist")
	}
	if err != store.ErrNotFound {
		t.Fatalf("outbox err=%v want ErrNotFound", err)
	}
}

func TestToolGetMetrics(t *testing.T) {
	st, srv := newSecurityTestServer(t)
	defer st.Close()
	defer srv.Close()

	req, err := http.NewRequest(http.MethodPost, srv.URL+"/v1/tools/get_metrics", bytes.NewReader([]byte("{}")))
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", "ak_acme_dev_001")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("do: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		t.Fatalf("status=%d want 200 body=%s", resp.StatusCode, b)
	}
	var snap map[string]float64
	if err := json.NewDecoder(resp.Body).Decode(&snap); err != nil {
		t.Fatalf("decode: %v", err)
	}
	for _, key := range []string{"events_ingested_total", "events_processed_total", "ledger_credits_total", "outbox_pending"} {
		if _, ok := snap[key]; !ok {
			t.Fatalf("missing %s in %v", key, snap)
		}
	}
}

func TestToolRejectsUnknownName(t *testing.T) {
	st, srv := newSecurityTestServer(t)
	defer st.Close()
	defer srv.Close()

	req, err := http.NewRequest(http.MethodPost, srv.URL+"/v1/tools/not_a_tool", bytes.NewReader([]byte("{}")))
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", "ak_acme_dev_001")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("do: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusNotFound {
		b, _ := io.ReadAll(resp.Body)
		t.Fatalf("status=%d want 404 body=%s", resp.StatusCode, b)
	}
	var body struct {
		Error string `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if body.Error != "unknown tool" {
		t.Fatalf("error=%q", body.Error)
	}
}
