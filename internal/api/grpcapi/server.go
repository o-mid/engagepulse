package grpcapi

import (
	"context"
	"errors"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	engagepulsev1 "github.com/o-mid/engagepulse/internal/api/gen/engagepulse/v1"
	"github.com/o-mid/engagepulse/internal/store"
)

type Server struct {
	engagepulsev1.UnimplementedPlayerServiceServer
	store *store.Store
}

func New(st *store.Store) *Server {
	return &Server{store: st}
}

func (s *Server) GetPlayer(ctx context.Context, req *engagepulsev1.GetPlayerRequest) (*engagepulsev1.GetPlayerResponse, error) {
	if req.GetTenantId() == "" || req.GetPlayerId() == "" {
		return nil, status.Error(codes.InvalidArgument, "tenant_id and player_id are required")
	}
	snap, err := s.store.GetPlayerSnapshot(ctx, req.GetTenantId(), req.GetPlayerId())
	if errors.Is(err, store.ErrNotFound) {
		return nil, status.Error(codes.NotFound, "player not found")
	}
	if err != nil {
		return nil, status.Errorf(codes.Internal, "lookup failed: %v", err)
	}
	return &engagepulsev1.GetPlayerResponse{
		TenantId:      snap.TenantID,
		PlayerId:      snap.PlayerID,
		Score:         snap.Score,
		VipTier:       snap.VIPTier,
		OfferTags:     snap.OfferTags,
		IntegrityFlag: snap.IntegrityFlag,
		Balance:       snap.Balance,
	}, nil
}
