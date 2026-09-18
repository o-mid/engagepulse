package httpapi_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/ingest"
)

func TestIngestRejectsUnknownSchemaVersion(t *testing.T) {
	st, srv := newSecurityTestServer(t)
	defer st.Close()
	defer srv.Close()

	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	evt := domain.Event{
		EventID:       "schema-bad-" + suffix,
		TenantID:      "acme-casino",
		PlayerID:      "schema-player-" + suffix,
		Type:          domain.EventDeposit,
		Amount:        50,
		SchemaVersion: 2,
		OccurredAt:    time.Now().UTC(),
	}
	body, err := json.Marshal(evt)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
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
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusBadRequest {
		b, _ := io.ReadAll(resp.Body)
		t.Fatalf("status=%d want 400 body=%s", resp.StatusCode, b)
	}
	b, _ := io.ReadAll(resp.Body)
	if !strings.Contains(string(b), "schema_version") {
		t.Fatalf("body=%s", b)
	}
}

func TestIngestAcceptsV1SchemaAndHeartbeat(t *testing.T) {
	st, srv := newSecurityTestServer(t)
	defer st.Close()
	defer srv.Close()

	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	deposit := domain.Event{
		EventID:       "schema-v1-" + suffix,
		TenantID:      "acme-casino",
		PlayerID:      "schema-player-" + suffix,
		Type:          domain.EventDeposit,
		Amount:        50,
		SchemaVersion: domain.EventSchemaV1,
		OccurredAt:    time.Now().UTC(),
	}
	postAccepted(t, srv.URL, deposit)

	hb := domain.Event{
		EventID:       "schema-hb-" + suffix,
		TenantID:      "acme-casino",
		PlayerID:      deposit.PlayerID,
		Type:          domain.EventSessionHeartbeat,
		SchemaVersion: domain.EventSchemaV1,
		OccurredAt:    time.Now().UTC(),
	}
	postAccepted(t, srv.URL, hb)
}

func postAccepted(t *testing.T, base string, evt domain.Event) {
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
}
