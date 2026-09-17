package rulepatch_test

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/o-mid/engagepulse/internal/rulepatch"
	"github.com/o-mid/engagepulse/internal/rules"
)

func TestNewDefaultIsMock(t *testing.T) {
	p, err := rulepatch.New("", "", "", nil)
	if err != nil {
		t.Fatalf("new: %v", err)
	}
	_, err = p.Propose(context.Background(), "raise velocity threshold", rules.Defaults())
	if err != nil {
		t.Fatalf("mock propose: %v", err)
	}
}

func TestOpenAIWithoutKeyFailsClosed(t *testing.T) {
	_, err := rulepatch.New("openai", "", "", nil)
	if err == nil || !strings.Contains(err.Error(), "OPENAI_API_KEY") {
		t.Fatalf("err=%v", err)
	}
}

func TestUnknownProposerFailsClosed(t *testing.T) {
	_, err := rulepatch.New("nope", "sk", "", nil)
	if err == nil || !strings.Contains(err.Error(), "unknown PROPOSER") {
		t.Fatalf("err=%v", err)
	}
}

func TestOpenAIRecordedJSON(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer sk-test" {
			t.Errorf("auth")
		}
		_, _ = io.WriteString(w, `{"choices":[{"message":{"content":"{\"velocity_bet_limit\":8}"}}]}`)
	}))
	defer srv.Close()

	p := rulepatch.OpenAI{Client: srv.Client(), APIKey: "sk-test", Model: "gpt-4o-mini", BaseURL: srv.URL}
	patch, err := p.Propose(context.Background(), "raise velocity threshold", rules.Defaults())
	if err != nil {
		t.Fatalf("propose: %v", err)
	}
	if patch.Thresholds.VelocityBetLimit != 8 {
		t.Fatalf("velocity=%d", patch.Thresholds.VelocityBetLimit)
	}
}

func TestOpenAIBadJSONFailsClosed(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, `{"choices":[{"message":{"content":"not json"}}]}`)
	}))
	defer srv.Close()

	p := rulepatch.OpenAI{Client: srv.Client(), APIKey: "sk-test", Model: "x", BaseURL: srv.URL}
	_, err := p.Propose(context.Background(), "raise velocity", rules.Defaults())
	if err == nil {
		t.Fatal("want json error")
	}
}
