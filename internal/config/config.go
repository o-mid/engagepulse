package config

import (
	"fmt"
	"os"
	"strings"
	"time"
)

type Config struct {
	HTTPAddr     string
	GRPCAddr     string
	DatabaseURL  string
	KafkaBrokers []string
	KafkaTopic   string
	LogLevel     string
	ShutdownTTL  time.Duration
}

func Load() (Config, error) {
	cfg := Config{
		HTTPAddr:     env("HTTP_ADDR", ":8080"),
		GRPCAddr:     env("GRPC_ADDR", ":9090"),
		DatabaseURL:  env("DATABASE_URL", "postgres://engagepulse:engagepulse@localhost:5432/engagepulse?sslmode=disable"),
		KafkaBrokers: splitCSV(env("KAFKA_BROKERS", "localhost:19092")),
		KafkaTopic:   env("KAFKA_TOPIC", "player.events"),
		LogLevel:     env("LOG_LEVEL", "info"),
		ShutdownTTL:  10 * time.Second,
	}
	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}
	if len(cfg.KafkaBrokers) == 0 {
		return Config{}, fmt.Errorf("KAFKA_BROKERS is required")
	}
	return cfg, nil
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func splitCSV(v string) []string {
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
