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
		DatabaseURL:  strings.TrimSpace(os.Getenv("DATABASE_URL")),
		KafkaBrokers: splitCSV(env("KAFKA_BROKERS", "localhost:19092")),
		KafkaTopic:   strings.TrimSpace(env("KAFKA_TOPIC", "player.events")),
		LogLevel:     env("LOG_LEVEL", "info"),
		ShutdownTTL:  10 * time.Second,
	}
	if cfg.DatabaseURL == "" {
		cfg.DatabaseURL = "postgres://engagepulse:engagepulse@localhost:5432/engagepulse?sslmode=disable"
	}
	if err := cfg.Validate(); err != nil {
		return Config{}, err
	}
	return cfg, nil
}

func (c Config) Validate() error {
	if strings.TrimSpace(c.HTTPAddr) == "" {
		return fmt.Errorf("HTTP_ADDR is required")
	}
	if strings.TrimSpace(c.GRPCAddr) == "" {
		return fmt.Errorf("GRPC_ADDR is required")
	}
	if strings.TrimSpace(c.DatabaseURL) == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	if len(c.KafkaBrokers) == 0 {
		return fmt.Errorf("KAFKA_BROKERS is required")
	}
	if strings.TrimSpace(c.KafkaTopic) == "" {
		return fmt.Errorf("KAFKA_TOPIC is required")
	}
	return nil
}

func env(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok {
		v = strings.TrimSpace(v)
		if v == "" {
			return ""
		}
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
