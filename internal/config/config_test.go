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
