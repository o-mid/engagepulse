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

	"github.com/o-mid/engagepulse/internal/ingest"
)

func TestRotateAcmeKeepsNovaAndRejectsRetiredKey(t *testing.T) {
	st, srv := newSecurityTestServer(t)
	defer srv.Close()
	defer st.Close()
	if err := st.RestoreHMAC(context.Background(), "acme-casino", "v1", "hmac_acme_dev_secret"); err != nil {
		t.Fatalf("restore start: %v", err)
	}
	defer func() {
		_ = st.RestoreHMAC(context.Background(), "acme-casino", "v1", "hmac_acme_dev_secret")
	}()

	rotateBody, err := json.Marshal(map[string]any{
		"secret":          "hmac_acme_rotated",
		"overlap_seconds": 2,
	})
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var req *http.Request
	req, err = http.NewRequest(http.MethodPost, srv.URL+"/v1/hmac/rotate", bytes.NewReader(rotateBody))
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", "ak_acme_dev_001")
	var resp *http.Response
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("rotate: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		t.Fatalf("rotate status=%d body=%s", resp.StatusCode, b)
	}
	var out map[string]string
	if err = json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out["key_id"] != "v2" || out["previous_key_id"] != "v1" {
		t.Fatalf("rotate ids=%v", out)
	}
	if _, ok := out["secret"]; ok {
		t.Fatal("rotate response must not include secret")
	}

	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	acmeOld := depositBody(t, "acme-casino", "rot-acme-old-"+suffix, "rot-acme-old-"+suffix)
	if status := postSigned(t, srv.URL+"/v1/events", acmeOld, "hmac_acme_dev_secret", "v1"); status != http.StatusAccepted {
		t.Fatalf("acme old during overlap status=%d", status)
	}
	acmeOldCap := depositBody(t, "acme-casino", "rot-acme-cap-"+suffix, "rot-acme-cap-"+suffix)
	if status := postSigned(t, srv.URL+"/v1/events", acmeOldCap, "hmac_acme_dev_secret", ""); status != http.StatusAccepted {
		t.Fatalf("captured acme body during overlap status=%d", status)
	}
	acmeNew := depositBody(t, "acme-casino", "rot-acme-new-"+suffix, "rot-acme-new-"+suffix)
	if status := postSigned(t, srv.URL+"/v1/events", acmeNew, "hmac_acme_rotated", "v2"); status != http.StatusAccepted {
		t.Fatalf("acme new status=%d", status)
	}
	novaBody := depositBody(t, "nova-sports", "rot-nova-"+suffix, "rot-nova-"+suffix)
	if status := postSigned(t, srv.URL+"/v1/events", novaBody, "hmac_nova_dev_secret", "v1"); status != http.StatusAccepted {
		t.Fatalf("nova after acme rotate status=%d", status)
	}

	time.Sleep(2100 * time.Millisecond)
	retired := depositBody(t, "acme-casino", "rot-acme-dead-"+suffix, "rot-acme-dead-"+suffix)
	if status := postSigned(t, srv.URL+"/v1/events", retired, "hmac_acme_dev_secret", "v1"); status != http.StatusUnauthorized {
		t.Fatalf("retired acme key status=%d want 401", status)
	}
	still := depositBody(t, "acme-casino", "rot-acme-live-"+suffix, "rot-acme-live-"+suffix)
	if status := postSigned(t, srv.URL+"/v1/events", still, "hmac_acme_rotated", "v2"); status != http.StatusAccepted {
		t.Fatalf("current acme after window status=%d", status)
	}
}

func postSigned(t *testing.T, url string, body []byte, secret, keyID string) int {
	t.Helper()
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Signature", ingest.Sign(secret, body))
	if keyID != "" {
		req.Header.Set(ingest.HeaderKeyID, keyID)
	}
	var resp *http.Response
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("do: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	return resp.StatusCode
}
