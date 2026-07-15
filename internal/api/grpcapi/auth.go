package grpcapi

import (
	"context"
	"strings"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	"github.com/o-mid/engagepulse/internal/store"
)

type ctxKey string

const tenantKey ctxKey = "tenant"

func TenantFromContext(ctx context.Context) (store.Tenant, bool) {
	t, ok := ctx.Value(tenantKey).(store.Tenant)
	return t, ok
}

func APIKeyUnaryInterceptor(st *store.Store) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req any, _ *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
		md, ok := metadata.FromIncomingContext(ctx)
		if !ok {
			return nil, status.Error(codes.Unauthenticated, "missing metadata")
		}
		values := md.Get("x-api-key")
		if len(values) == 0 || strings.TrimSpace(values[0]) == "" {
			return nil, status.Error(codes.Unauthenticated, "missing api key")
		}
		tenant, err := st.GetTenantByAPIKey(ctx, values[0])
		if err != nil {
			return nil, status.Error(codes.Unauthenticated, "invalid api key")
		}
		return handler(context.WithValue(ctx, tenantKey, tenant), req)
	}
}
