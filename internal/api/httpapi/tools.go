package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/o-mid/engagepulse/internal/metrics"
	"github.com/o-mid/engagepulse/internal/store"
)

func (s *Server) handleTool(w http.ResponseWriter, r *http.Request) {
	tenant, ok := TenantFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		writeError(w, http.StatusBadRequest, "read body failed")
		return
	}

	switch r.PathValue("name") {
	case "ingest":
		s.acceptSignedEvent(w, r, body, tenant.ID)
	case "get_player":
		s.handleToolGetPlayer(w, r, tenant, body)
	case "get_metrics":
		s.handleToolGetMetrics(w)
	default:
		writeError(w, http.StatusNotFound, "unknown tool")
	}
}

func (s *Server) handleToolGetMetrics(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(metrics.JSONSnapshot())
}

func (s *Server) handleToolGetPlayer(w http.ResponseWriter, r *http.Request, tenant store.Tenant, body []byte) {
	var args struct {
		PlayerID string `json:"player_id"`
	}
	if len(body) > 0 {
		if err := json.Unmarshal(body, &args); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json")
			return
		}
	}
	if args.PlayerID == "" {
		writeError(w, http.StatusBadRequest, "player_id required")
		return
	}

	snap, err := s.store.GetPlayerSnapshot(r.Context(), tenant.ID, args.PlayerID)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "player not found")
		return
	}
	if err != nil {
		s.logger.Error("tool get_player", "err", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(snap)
}
