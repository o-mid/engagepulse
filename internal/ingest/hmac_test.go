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

func TestVerifyKeysOverlapAndRetire(t *testing.T) {
	body := []byte(`{"event_id":"captured"}`)
	oldSig := Sign("old-secret", body)
	newSig := Sign("new-secret", body)
	keys := []Key{
		{ID: "v2", Secret: "new-secret"},
		{ID: "v1", Secret: "old-secret"},
	}

	if err := VerifyKeys(keys, "", oldSig, body); err != nil {
		t.Fatalf("captured body must verify during overlap: %v", err)
	}
	if err := VerifyKeys(keys, "v1", oldSig, body); err != nil {
		t.Fatalf("v1 during overlap: %v", err)
	}
	if err := VerifyKeys(keys, "v2", newSig, body); err != nil {
		t.Fatalf("v2: %v", err)
	}
	if err := VerifyKeys(keys, "v1", newSig, body); err == nil {
		t.Fatal("v1 id with v2 signature must fail")
	}

	retired := []Key{{ID: "v2", Secret: "new-secret"}}
	if err := VerifyKeys(retired, "", oldSig, body); err == nil {
		t.Fatal("captured old body must fail after window")
	}
	if err := VerifyKeys(retired, "v1", oldSig, body); err == nil {
		t.Fatal("retired key id must fail after window")
	}
	if err := VerifyKeys(retired, "v2", newSig, body); err != nil {
		t.Fatalf("current key after retire: %v", err)
	}
}
