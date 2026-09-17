package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/o-mid/engagepulse/internal/kafka"
)

func (s *Server) handleListDLQ(w http.ResponseWriter, r *http.Request) {
	tenant, ok := TenantFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	n := 20
	if q := r.URL.Query().Get("n"); q != "" {
		parsed, err := strconv.Atoi(q)
		if err == nil && parsed > 0 {
			n = parsed
		}
	}
	if n > 100 {
		n = 100
	}

	items := []kafka.DeadLetter{}
	if s.dlq != nil {
		ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
		defer cancel()
		all, err := s.dlq.Recent(ctx, 100)
		if err != nil {
			s.logger.Error("list dlq", "err", err)
			writeError(w, http.StatusBadGateway, "dlq unavailable")
			return
		}
		for _, dl := range all {
			if dl.Event.TenantID != tenant.ID {
				continue
			}
			items = append(items, dl)
			if len(items) >= n {
				break
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"items": items})
}
