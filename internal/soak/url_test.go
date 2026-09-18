package soak

import "testing"

func TestGuardURLAllowsLocal(t *testing.T) {
	if err := GuardURL("http://127.0.0.1:8080"); err != nil {
		t.Fatal(err)
	}
}

func TestGuardURLRefusesRailway(t *testing.T) {
	err := GuardURL("https://api-production-2ef9b.up.railway.app")
	if err == nil {
		t.Fatal("expected error")
	}
}
