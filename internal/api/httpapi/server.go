package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/ingest"
	"github.com/o-mid/engagepulse/internal/store"
)

type EventPublisher interface {
	Publish(ctx context.Context, evt domain.Event) error
}

type Server struct {
	store  *store.Store
	pub    EventPublisher
	logger *slog.Logger
	mux    *http.ServeMux
}

func New(st *store.Store, pub EventPublisher, logger *slog.Logger) *Server {
	s := &Server{store: st, pub: pub, logger: logger, mux: http.NewServeMux()}
	s.mux.HandleFunc("GET /healthz", s.handleHealth)
	s.mux.HandleFunc("POST /v1/events", s.handleIngest)
	s.mux.HandleFunc("GET /v1/players/{id}", s.handleGetPlayer)
	return s
}

func (s *Server) Handler() http.Handler {
	return s.mux
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))
}

func (s *Server) handleIngest(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		http.Error(w, "read body", http.StatusBadRequest)
		return
	}

	var evt domain.Event
	if err := json.Unmarshal(body, &evt); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if evt.EventID == "" || evt.TenantID == "" || evt.PlayerID == "" || evt.Type == "" {
		http.Error(w, "missing required fields", http.StatusBadRequest)
		return
	}
	if evt.OccurredAt.IsZero() {
		evt.OccurredAt = time.Now().UTC()
	}

	tenant, err := s.store.GetTenant(r.Context(), evt.TenantID)
	if err != nil {
		http.Error(w, "unknown tenant", http.StatusUnauthorized)
		return
	}

	sig := r.Header.Get("X-Signature")
	if err := ingest.Verify(tenant.HMACSecret, sig, body); err != nil {
		http.Error(w, "invalid signature", http.StatusUnauthorized)
		return
	}

	if err := s.store.EnsurePlayer(r.Context(), evt.TenantID, evt.PlayerID); err != nil {
		s.logger.Error("ensure player", "err", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	if err := s.pub.Publish(r.Context(), evt); err != nil {
		s.logger.Error("publish event", "err", err)
		http.Error(w, "publish failed", http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"status":   "accepted",
		"event_id": evt.EventID,
	})
}

func (s *Server) handleGetPlayer(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	playerID := r.PathValue("id")
	if tenantID == "" || playerID == "" {
		http.Error(w, "tenant and player required", http.StatusBadRequest)
		return
	}
	snap, err := s.store.GetPlayerSnapshot(r.Context(), tenantID, playerID)
	if errors.Is(err, store.ErrNotFound) {
		http.Error(w, "player not found", http.StatusNotFound)
		return
	}
	if err != nil {
		s.logger.Error("get player", "err", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(snap)
}
