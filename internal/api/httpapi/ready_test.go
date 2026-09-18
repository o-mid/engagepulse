package httpapi_test

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/o-mid/engagepulse/internal/api/httpapi"
	"github.com/o-mid/engagepulse/internal/store"
)

func TestLivezOKWhenReadyFails(t *testing.T) {
	st, api, srv := newReadyTestServer(t)
	defer st.Close()
	defer srv.Close()
	api.SetReady(func(context.Context) error {
		return fmt.Errorf("broker down")
	})

	for _, path := range []string{"/livez", "/healthz"} {
		resp, err := http.Get(srv.URL + path)
		if err != nil {
			t.Fatalf("%s: %v", path, err)
		}
		body, _ := io.ReadAll(resp.Body)
		_ = resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("%s status=%d want 200", path, resp.StatusCode)
		}
		if string(body) != "ok" {
			t.Fatalf("%s body=%q want ok", path, body)
		}
	}

	resp, err := http.Get(srv.URL + "/readyz")
	if err != nil {
		t.Fatalf("readyz: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("readyz status=%d want 503", resp.StatusCode)
	}
	var got struct {
		OK    bool   `json:"ok"`
		Error string `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if got.OK {
		t.Fatal("readyz ok=true want false")
	}
	if got.Error == "" {
		t.Fatal("readyz missing error")
	}
}

func TestReadyzOKWhenStoreUp(t *testing.T) {
	st, _, srv := newReadyTestServer(t)
	defer st.Close()
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/readyz")
	if err != nil {
		t.Fatalf("readyz: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		t.Fatalf("status=%d body=%s", resp.StatusCode, b)
	}
	var got struct {
		OK bool `json:"ok"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if !got.OK {
		t.Fatal("readyz ok=false")
	}
}

func newReadyTestServer(t *testing.T) (*store.Store, *httpapi.Server, *httptest.Server) {
	t.Helper()
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL not set")
	}
	ctx := context.Background()
	st, err := store.Open(ctx, dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	if err = st.Migrate(ctx); err != nil {
		st.Close()
		t.Fatalf("migrate: %v", err)
	}
	api := httpapi.New(st, st, slog.Default())
	return st, api, httptest.NewServer(api.Handler())
}
