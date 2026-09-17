package store_test

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/o-mid/engagepulse/internal/store"
)

func TestRotateAcmeLeavesNovaSecret(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL not set")
	}
	ctx := context.Background()
	st, err := store.Open(ctx, dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer st.Close()
	if err = st.Migrate(ctx); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	if err = st.RestoreHMAC(ctx, "acme-casino", "v1", "hmac_acme_dev_secret"); err != nil {
		t.Fatalf("restore start: %v", err)
	}
	defer func() {
		_ = st.RestoreHMAC(ctx, "acme-casino", "v1", "hmac_acme_dev_secret")
	}()

	novaBefore, err := st.GetTenant(ctx, "nova-sports")
	if err != nil {
		t.Fatalf("nova: %v", err)
	}

	acme, err := st.RotateHMAC(ctx, "acme-casino", "hmac_acme_rotated", time.Hour)
	if err != nil {
		t.Fatalf("rotate: %v", err)
	}
	if acme.HMACKeyID != "v2" || acme.HMACSecret != "hmac_acme_rotated" {
		t.Fatalf("acme current key=%s", acme.HMACKeyID)
	}
	if acme.HMACPrevKeyID != "v1" || acme.HMACPrevSecret != "hmac_acme_dev_secret" {
		t.Fatalf("acme previous key=%s", acme.HMACPrevKeyID)
	}
	if !acme.PreviousLive(time.Now().UTC()) {
		t.Fatal("overlap window missing")
	}

	novaAfter, err := st.GetTenant(ctx, "nova-sports")
	if err != nil {
		t.Fatalf("nova after: %v", err)
	}
	if novaAfter.HMACSecret != novaBefore.HMACSecret || novaAfter.HMACKeyID != novaBefore.HMACKeyID {
		t.Fatalf("nova key id changed %s -> %s", novaBefore.HMACKeyID, novaAfter.HMACKeyID)
	}
}
