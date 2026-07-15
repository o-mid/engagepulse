package httpapi

import (
	"context"
	"net/http"

	"github.com/o-mid/engagepulse/internal/store"
)

type ctxKey string

const tenantKey ctxKey = "tenant"

func TenantFromContext(ctx context.Context) (store.Tenant, bool) {
	t, ok := ctx.Value(tenantKey).(store.Tenant)
	return t, ok
}

func (s *Server) requireAPIKey(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := r.Header.Get("X-API-Key")
		if key == "" {
			http.Error(w, "missing api key", http.StatusUnauthorized)
			return
		}
		tenant, err := s.store.GetTenantByAPIKey(r.Context(), key)
		if err != nil {
			http.Error(w, "invalid api key", http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), tenantKey, tenant)
		next(w, r.WithContext(ctx))
	}
}
