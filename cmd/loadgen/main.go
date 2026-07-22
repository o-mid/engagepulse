package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/ingest"
	"github.com/o-mid/engagepulse/internal/provider"
)

type mockProvider struct {
	mode string
}

func (m mockProvider) NextEvents(tenantID string, n int) []domain.Event {
	out := make([]domain.Event, 0, n)
	now := time.Now().UTC()
	for i := 0; i < n; i++ {
		player := fmt.Sprintf("load-%s-%d", tenantID, i%3)
		typ := domain.EventBetPlaced
		amount := int64(400 + i*100)
		if i == 0 {
			typ = domain.EventDeposit
			amount = 50
		}
		if m.mode == "velocity" {
			player = fmt.Sprintf("load-%s-0", tenantID)
			if i == 0 {
				typ = domain.EventDeposit
				amount = 50
			} else {
				typ = domain.EventBetPlaced
				amount = 10
			}
		}
		out = append(out, domain.Event{
			EventID:    fmt.Sprintf("%s-%d-%d", tenantID, now.UnixNano(), i),
			TenantID:   tenantID,
			PlayerID:   player,
			Type:       typ,
			Amount:     amount,
			OccurredAt: now,
		})
	}
	return out
}

func main() {
	baseURL := flag.String("url", "http://localhost:8080", "API base URL")
	tenant := flag.String("tenant", "acme-casino", "tenant id")
	secret := flag.String("secret", "hmac_acme_dev_secret", "HMAC secret")
	count := flag.Int("n", 8, "events to send")
	mode := flag.String("mode", "vip", "vip or velocity")
	flag.Parse()

	var gp provider.GameProvider = mockProvider{mode: *mode}
	events := gp.NextEvents(*tenant, *count)
	client := &http.Client{Timeout: 5 * time.Second}

	for _, evt := range events {
		body, err := json.Marshal(evt)
		if err != nil {
			fail(err)
		}
		req, err := http.NewRequest(http.MethodPost, *baseURL+"/v1/events", bytes.NewReader(body))
		if err != nil {
			fail(err)
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Signature", ingest.Sign(*secret, body))
		resp, err := client.Do(req)
		if err != nil {
			fail(err)
		}
		_ = resp.Body.Close()
		if resp.StatusCode != http.StatusAccepted {
			fail(fmt.Errorf("status %d for %s", resp.StatusCode, evt.EventID))
		}
		fmt.Printf("accepted %s type=%s player=%s amount=%d\n", evt.EventID, evt.Type, evt.PlayerID, evt.Amount)
	}
}

func fail(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
