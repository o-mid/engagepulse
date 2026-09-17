package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/o-mid/engagepulse/internal/ingest"
	"github.com/o-mid/engagepulse/internal/store"
)

func tenantHMACKeys(t store.Tenant, now time.Time) []ingest.Key {
	id := t.HMACKeyID
	if id == "" {
		id = "v1"
	}
	keys := []ingest.Key{{ID: id, Secret: t.HMACSecret}}
	if t.HMACPrevSecret != "" && t.HMACPrevUntil != nil && now.Before(*t.HMACPrevUntil) {
		keys = append(keys, ingest.Key{ID: t.HMACPrevKeyID, Secret: t.HMACPrevSecret})
	}
	return keys
}

func (s *Server) handleRotateHMAC(w http.ResponseWriter, r *http.Request) {
	tenant, ok := TenantFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req struct {
		Secret         string `json:"secret"`
		OverlapSeconds int    `json:"overlap_seconds"`
	}
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if strings.TrimSpace(req.Secret) == "" {
		writeError(w, http.StatusBadRequest, "secret required")
		return
	}
	overlap := time.Duration(req.OverlapSeconds) * time.Second
	var rotated store.Tenant
	rotated, err = s.store.RotateHMAC(r.Context(), tenant.ID, req.Secret, overlap)
	if err != nil {
		s.logger.Error("rotate hmac", "tenant_id", tenant.ID, "err", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	out := map[string]string{
		"key_id":          rotated.HMACKeyID,
		"previous_key_id": rotated.HMACPrevKeyID,
	}
	if rotated.HMACPrevUntil != nil {
		out["previous_until"] = rotated.HMACPrevUntil.UTC().Format(time.RFC3339)
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out)
}
