package config

import "testing"

func TestValidateRejectsEmptyValues(t *testing.T) {
	cfg := Config{
		HTTPAddr:      ":8080",
		GRPCAddr:      ":9090",
		DatabaseURL:   "postgres://x",
		KafkaBrokers:  []string{"localhost:19092"},
		KafkaTopic:    "player.events",
		KafkaDLQTopic: "player.events.dlq",
	}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("valid config rejected: %v", err)
	}
	cfg.KafkaTopic = "   "
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected empty kafka topic to fail")
	}
}

func TestFailInjectDefaultOff(t *testing.T) {
	t.Setenv("FAIL_INJECT", "")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if cfg.FailInject {
		t.Fatal("FAIL_INJECT must default off")
	}

	t.Setenv("FAIL_INJECT", "true")
	cfg, err = Load()
	if err != nil {
		t.Fatalf("load on: %v", err)
	}
	if !cfg.FailInject {
		t.Fatal("FAIL_INJECT=true should enable inject")
	}

	t.Setenv("FAIL_INJECT", "0")
	cfg, err = Load()
	if err != nil {
		t.Fatalf("load off: %v", err)
	}
	if cfg.FailInject {
		t.Fatal("FAIL_INJECT=0 should stay off")
	}
}
