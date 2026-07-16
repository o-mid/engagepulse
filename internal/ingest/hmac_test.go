package ingest

import "testing"

func TestSignAndVerify(t *testing.T) {
	body := []byte(`{"event_id":"e1"}`)
	sig := Sign("secret", body)
	if err := Verify("secret", sig, body); err != nil {
		t.Fatalf("expected valid signature: %v", err)
	}
	if err := Verify("wrong", sig, body); err == nil {
		t.Fatal("expected invalid signature")
	}
}
