package ingest

import (
	"strings"
	"testing"
	"time"

	"github.com/o-mid/engagepulse/internal/domain"
)

func TestValidateEventAcceptsMissingAndV1Schema(t *testing.T) {
	base := domain.Event{
		EventID:    "schema-ok",
		TenantID:   "acme-casino",
		PlayerID:   "p1",
		Type:       domain.EventDeposit,
		Amount:     50,
		OccurredAt: time.Now().UTC(),
	}
	if err := ValidateEvent(base); err != nil {
		t.Fatalf("missing version: %v", err)
	}
	base.SchemaVersion = domain.EventSchemaV1
	if err := ValidateEvent(base); err != nil {
		t.Fatalf("v1: %v", err)
	}
	hb := base
	hb.Type = domain.EventSessionHeartbeat
	hb.Amount = 0
	if err := ValidateEvent(hb); err != nil {
		t.Fatalf("heartbeat: %v", err)
	}
}

func TestValidateEventRejectsUnknownSchema(t *testing.T) {
	evt := domain.Event{
		EventID:       "schema-bad",
		TenantID:      "acme-casino",
		PlayerID:      "p1",
		Type:          domain.EventDeposit,
		Amount:        50,
		SchemaVersion: 2,
		OccurredAt:    time.Now().UTC(),
	}
	err := ValidateEvent(evt)
	if err == nil {
		t.Fatal("expected error")
	}
	if !strings.Contains(err.Error(), "schema_version") {
		t.Fatalf("err=%v", err)
	}
}
