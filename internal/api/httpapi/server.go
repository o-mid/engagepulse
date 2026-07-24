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
	"github.com/o-mid/engagepulse/internal/metrics"
	"github.com/o-mid/engagepulse/internal/store"
)

type EventAccepter interface {
	EnqueueEvent(ctx context.Context, evt domain.Event) error
}

type Server struct {
	store  *store.Store
	accept EventAccepter
	logger *slog.Logger
	mux    *http.ServeMux
}

func New(st *store.Store, accept EventAccepter, logger *slog.Logger) *Server {
	s := &Server{store: st, accept: accept, logger: logger, mux: http.NewServeMux()}
	s.mux.HandleFunc("GET /healthz", s.handleHealth)
	s.mux.Handle("GET /metrics", metrics.Handler())
	s.mux.HandleFunc("POST /v1/events", s.handleIngest)
	s.mux.HandleFunc("GET /v1/players/{id}", s.requireAPIKey(s.handleGetPlayer))
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
		writeError(w, http.StatusBadRequest, "read body failed")
		return
	}

	var evt domain.Event
	if err := json.Unmarshal(body, &evt); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := ingest.ValidateEvent(evt); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if evt.OccurredAt.IsZero() {
		evt.OccurredAt = time.Now().UTC()
	}

	tenant, err := s.store.GetTenant(r.Context(), evt.TenantID)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	sig := r.Header.Get("X-Signature")
	if sig == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if err := ingest.Verify(tenant.HMACSecret, sig, body); err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	err = s.accept.EnqueueEvent(r.Context(), evt)
	if errors.Is(err, store.ErrDuplicateEvent) {
		// Idempotent retry: already durably accepted.
		metrics.EventsIngested.Inc()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"status":   "accepted",
			"event_id": evt.EventID,
		})
		return
	}
	if err != nil {
		s.logger.Error("enqueue event", "err", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	metrics.EventsIngested.Inc()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"status":   "accepted",
		"event_id": evt.EventID,
	})
}

func (s *Server) handleGetPlayer(w http.ResponseWriter, r *http.Request) {
	tenant, ok := TenantFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	playerID := r.PathValue("id")
	if playerID == "" {
		http.Error(w, "player required", http.StatusBadRequest)
		return
	}
	snap, err := s.store.GetPlayerSnapshot(r.Context(), tenant.ID, playerID)
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
