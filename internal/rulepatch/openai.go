package rulepatch

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/o-mid/engagepulse/internal/rules"
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

type proposedJSON struct {
	WelcomeCredit      *int64 `json:"welcome_credit"`
	VIPSilverThreshold *int64 `json:"vip_silver_threshold"`
	VIPGoldThreshold   *int64 `json:"vip_gold_threshold"`
	VelocityBetLimit   *int64 `json:"velocity_bet_limit"`
}

func (o OpenAI) Propose(ctx context.Context, request string, current rules.Thresholds) (Patch, error) {
	if o.APIKey == "" {
		return Patch{}, fmt.Errorf("openai proposer: missing api key")
	}
	base := o.BaseURL
	if base == "" {
		base = "https://api.openai.com/v1"
	}
	body, err := json.Marshal(chatRequest{
		Model: o.Model,
		Messages: []chatMessage{
			{Role: "system", Content: "Reply with JSON only: welcome_credit, vip_silver_threshold, vip_gold_threshold, velocity_bet_limit. Integers. No markdown."},
			{Role: "user", Content: fmt.Sprintf("current: %+v\nrequest: %s", current, request)},
		},
	})
	if err != nil {
		return Patch{}, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(base, "/")+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return Patch{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+o.APIKey)

	resp, err := o.Client.Do(req)
	if err != nil {
		return Patch{}, fmt.Errorf("openai proposer: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return Patch{}, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return Patch{}, fmt.Errorf("openai proposer: status %d", resp.StatusCode)
	}
	var parsed chatResponse
	err = json.Unmarshal(raw, &parsed)
	if err != nil {
		return Patch{}, fmt.Errorf("openai proposer: decode: %w", err)
	}
	if len(parsed.Choices) == 0 {
		return Patch{}, fmt.Errorf("openai proposer: empty choices")
	}
	content := stripFence(parsed.Choices[0].Message.Content)
	var next proposedJSON
	err = json.Unmarshal([]byte(content), &next)
	if err != nil {
		return Patch{}, fmt.Errorf("openai proposer: json: %w", err)
	}
	out := current
	changed := false
	if next.WelcomeCredit != nil {
		out.WelcomeCredit = *next.WelcomeCredit
		changed = true
	}
	if next.VIPSilverThreshold != nil {
		out.VIPSilverThreshold = *next.VIPSilverThreshold
		changed = true
	}
	if next.VIPGoldThreshold != nil {
		out.VIPGoldThreshold = *next.VIPGoldThreshold
		changed = true
	}
	if next.VelocityBetLimit != nil {
		out.VelocityBetLimit = *next.VelocityBetLimit
		changed = true
	}
	if !changed {
		return Patch{}, fmt.Errorf("openai proposer: no threshold fields")
	}
	return Patch{Thresholds: out, Diff: Diff(current, out)}, nil
}

func stripFence(s string) string {
	s = strings.TrimSpace(s)
	s = strings.TrimPrefix(s, "```json")
	s = strings.TrimPrefix(s, "```")
	s = strings.TrimSuffix(s, "```")
	return strings.TrimSpace(s)
}
