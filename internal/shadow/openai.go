package shadow

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/o-mid/engagepulse/internal/domain"
)

type OpenAI struct {
	Client  *http.Client
	APIKey  string
	Model   string
	BaseURL string
}

type chatRequest struct {
	Model    string        `json:"model"`
	Messages []chatMessage `json:"messages"`
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatResponse struct {
	Choices []struct {
		Message chatMessage `json:"message"`
	} `json:"choices"`
}

type scoreJSON struct {
	Flag *bool `json:"flag"`
}

type burstEvent struct {
	Type       string `json:"type"`
	OccurredAt string `json:"occurred_at"`
	Amount     int64  `json:"amount,omitempty"`
}

func (o OpenAI) Score(ctx context.Context, events []domain.Event) (Decision, error) {
	if o.APIKey == "" {
		return Decision{}, fmt.Errorf("openai scorer: missing api key")
	}
	base := o.BaseURL
	if base == "" {
		base = "https://api.openai.com/v1"
	}
	summary := make([]burstEvent, 0, len(events))
	for _, evt := range events {
		summary = append(summary, burstEvent{
			Type:       evt.Type,
			Amount:     evt.Amount,
			OccurredAt: evt.OccurredAt.UTC().Format("2006-01-02T15:04:05Z"),
		})
	}
	payload, err := json.Marshal(summary)
	if err != nil {
		return Decision{}, err
	}
	body, err := json.Marshal(chatRequest{
		Model: o.Model,
		Messages: []chatMessage{
			{Role: "system", Content: `Reply with JSON only: {"flag": true} or {"flag": false}. Would you flag this bet burst for velocity? No markdown.`},
			{Role: "user", Content: string(payload)},
		},
	})
	if err != nil {
		return Decision{}, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(base, "/")+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return Decision{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+o.APIKey)

	resp, err := o.Client.Do(req)
	if err != nil {
		return Decision{}, fmt.Errorf("openai scorer: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return Decision{}, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return Decision{}, fmt.Errorf("openai scorer: status %d", resp.StatusCode)
	}
	var parsed chatResponse
	err = json.Unmarshal(raw, &parsed)
	if err != nil {
		return Decision{}, fmt.Errorf("openai scorer: decode: %w", err)
	}
	if len(parsed.Choices) == 0 {
		return Decision{}, fmt.Errorf("openai scorer: empty choices")
	}
	content := stripFence(parsed.Choices[0].Message.Content)
	var next scoreJSON
	err = json.Unmarshal([]byte(content), &next)
	if err != nil {
		return Decision{}, fmt.Errorf("openai scorer: json: %w", err)
	}
	if next.Flag == nil {
		return Decision{}, fmt.Errorf("openai scorer: missing flag")
	}
	return Decision{Flag: *next.Flag, Reason: "openai"}, nil
}

func stripFence(s string) string {
	s = strings.TrimSpace(s)
	s = strings.TrimPrefix(s, "```json")
	s = strings.TrimPrefix(s, "```")
	s = strings.TrimSuffix(s, "```")
	return strings.TrimSpace(s)
}
