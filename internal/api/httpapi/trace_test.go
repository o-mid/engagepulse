package httpapi_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/ingest"
	"go.opentelemetry.io/otel/trace"
)

func TestIngestReturnsTraceID(t *testing.T) {
	st, srv := newSecurityTestServer(t)
	defer st.Close()
	defer srv.Close()

	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	evt := domain.Event{
		EventID:    "trace-" + suffix,
		TenantID:   "acme-casino",
		PlayerID:   "trace-player-" + suffix,
		Type:       domain.EventDeposit,
		Amount:     50,
		OccurredAt: time.Now().UTC(),
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
	if resp.StatusCode != http.StatusAccepted {
		b, _ := io.ReadAll(resp.Body)
		t.Fatalf("status=%d body=%s", resp.StatusCode, b)
	}
	id := resp.Header.Get("X-Trace-Id")
	if _, err := trace.TraceIDFromHex(id); err != nil {
		t.Fatalf("X-Trace-Id %q: %v", id, err)
	}
}
