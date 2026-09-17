package replay

import (
	"strings"
	"testing"

	"github.com/o-mid/engagepulse/internal/domain"
)

func TestFormatTraces(t *testing.T) {
	r := Report{Results: []BrandResult{
		{Brand: "acme-casino", Pass: true, Got: domain.PlayerSnapshot{VIPTier: "silver"}, Want: domain.PlayerSnapshot{VIPTier: "silver"}},
		{Brand: "nova-sports", Pass: false, Got: domain.PlayerSnapshot{IntegrityFlag: ""}, Want: domain.PlayerSnapshot{IntegrityFlag: "velocity"}},
	}}
	out := Format(r)
	if !strings.Contains(out, "pass acme-casino") {
		t.Fatalf("missing pass: %s", out)
	}
	if !strings.Contains(out, "fail nova-sports") {
		t.Fatalf("missing fail: %s", out)
	}
	if !strings.Contains(out, "velocity") {
		t.Fatalf("missing want flag: %s", out)
	}
}
