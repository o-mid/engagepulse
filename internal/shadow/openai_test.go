package shadow_test

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/shadow"
)

func TestOpenAIRecordedJSON(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer sk-test" {
			t.Errorf("auth")
		}
		_, _ = io.WriteString(w, `{"choices":[{"message":{"content":"{\"flag\":true}"}}]}`)
	}))
	defer srv.Close()

	s := shadow.OpenAI{Client: srv.Client(), APIKey: "sk-test", Model: "gpt-4o-mini", BaseURL: srv.URL}
	dec, err := s.Score(context.Background(), []domain.Event{{
		Type:       domain.EventBetPlaced,
		Amount:     10,
		OccurredAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}})
	if err != nil {
		t.Fatalf("score: %v", err)
	}
	if !dec.Flag {
		t.Fatal("want flag")
	}
}

func TestOpenAIBadJSONFailsClosed(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, `{"choices":[{"message":{"content":"not json"}}]}`)
	}))
	defer srv.Close()

	s := shadow.OpenAI{Client: srv.Client(), APIKey: "sk-test", Model: "x", BaseURL: srv.URL}
	_, err := s.Score(context.Background(), nil)
	if err == nil {
		t.Fatal("want json error")
	}
}

func TestOpenAIMissingFlagFailsClosed(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, `{"choices":[{"message":{"content":"{}"}}]}`)
	}))
	defer srv.Close()

	s := shadow.OpenAI{Client: srv.Client(), APIKey: "sk-test", Model: "x", BaseURL: srv.URL}
	_, err := s.Score(context.Background(), nil)
	if err == nil {
		t.Fatal("want missing flag error")
	}
}
