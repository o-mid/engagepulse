package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/ingest"
	"github.com/o-mid/engagepulse/internal/soak"
)

func main() {
	baseURL := flag.String("url", "http://127.0.0.1:8080", "API base URL (local only)")
	secret := flag.String("secret", "hmac_acme_dev_secret", "HMAC secret")
	keyID := flag.String("key-id", "v1", "HMAC key id")
	apiKey := flag.String("api-key", "ak_acme_dev_001", "API key for GET player")
	tenant := flag.String("tenant", "acme-casino", "tenant id")
	n := flag.Int("n", 20, "unique first-deposit players")
	dup := flag.Int("dup", 3, "extra deliveries of each event_id")
	wait := flag.Duration("wait", 60*time.Second, "time to wait for worker catch-up")
	flag.Parse()

	if err := soak.GuardURL(*baseURL); err != nil {
		fail(err)
	}

	client := &http.Client{Timeout: 5 * time.Second}
	creditsBefore, err := metric(client, *baseURL, "engagepulse_ledger_credits_total")
	if err != nil {
		fail(fmt.Errorf("metrics: %w (is make run up?)", err))
	}

	type sent struct {
		eventID  string
		playerID string
	}
	now := time.Now().UTC()
	var batch []sent
	for i := 0; i < *n; i++ {
		playerID := fmt.Sprintf("soak-%d-%d", now.UnixNano(), i)
		eventID := fmt.Sprintf("soak-evt-%d-%d", now.UnixNano(), i)
		evt := domain.Event{
			EventID:    eventID,
			TenantID:   *tenant,
			PlayerID:   playerID,
			Type:       domain.EventDeposit,
			Amount:     50,
			OccurredAt: now,
		}
		if err := postEvent(client, *baseURL, *secret, *keyID, evt); err != nil {
			fail(err)
		}
		batch = append(batch, sent{eventID: eventID, playerID: playerID})
	}
	for round := 0; round < *dup; round++ {
		for _, item := range batch {
			evt := domain.Event{
				EventID:    item.eventID,
				TenantID:   *tenant,
				PlayerID:   item.playerID,
				Type:       domain.EventDeposit,
				Amount:     50,
				OccurredAt: now,
			}
			if err := postEvent(client, *baseURL, *secret, *keyID, evt); err != nil {
				fail(err)
			}
		}
	}

	deadline := time.Now().Add(*wait)
	var creditsAfter int
	for {
		creditsAfter, err = metric(client, *baseURL, "engagepulse_ledger_credits_total")
		if err != nil {
			fail(err)
		}
		if creditsAfter-creditsBefore >= *n {
			break
		}
		if time.Now().After(deadline) {
			fail(fmt.Errorf("timeout: credits Δ %d want %d", creditsAfter-creditsBefore, *n))
		}
		time.Sleep(400 * time.Millisecond)
	}
	delta := creditsAfter - creditsBefore
	if delta != *n {
		fail(fmt.Errorf("credits Δ %d want %d unique events", delta, *n))
	}

	for _, item := range batch {
		bal, err := playerBalance(client, *baseURL, *apiKey, item.playerID)
		if err != nil {
			fail(err)
		}
		if bal != 100 {
			fail(fmt.Errorf("player %s balance=%d want 100", item.playerID, bal))
		}
	}
	fmt.Printf("soak ok unique=%d extra_deliveries=%d credits_delta=%d balance=100\n", *n, *dup, delta)
}

func postEvent(client *http.Client, base, secret, keyID string, evt domain.Event) error {
	body, err := json.Marshal(evt)
	if err != nil {
		return err
	}
	req, err := http.NewRequest(http.MethodPost, strings.TrimRight(base, "/")+"/v1/events", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Signature", ingest.Sign(secret, body))
	if strings.TrimSpace(keyID) != "" {
		req.Header.Set(ingest.HeaderKeyID, keyID)
	}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusAccepted {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("ingest %d %s: %s", resp.StatusCode, evt.EventID, b)
	}
	return nil
}

func metric(client *http.Client, base, name string) (int, error) {
	resp, err := client.Get(strings.TrimRight(base, "/") + "/metrics")
	if err != nil {
		return 0, err
	}
	defer func() { _ = resp.Body.Close() }()
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, err
	}
	total := 0
	found := false
	for _, line := range strings.Split(string(b), "\n") {
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if !strings.HasPrefix(line, name) {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		n, err := strconv.ParseFloat(fields[len(fields)-1], 64)
		if err != nil {
			continue
		}
		total += int(n)
		found = true
	}
	if !found {
		return 0, nil
	}
	return total, nil
}

func playerBalance(client *http.Client, base, apiKey, playerID string) (int64, error) {
	req, err := http.NewRequest(http.MethodGet, strings.TrimRight(base, "/")+"/v1/players/"+playerID, nil)
	if err != nil {
		return 0, err
	}
	req.Header.Set("X-API-Key", apiKey)
	resp, err := client.Do(req)
	if err != nil {
		return 0, err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return 0, fmt.Errorf("player %s status %d: %s", playerID, resp.StatusCode, b)
	}
	var snap struct {
		Balance int64 `json:"balance"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&snap); err != nil {
		return 0, err
	}
	return snap.Balance, nil
}

func fail(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
