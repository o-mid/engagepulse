package kafka

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"
)

func TestPingNoBrokers(t *testing.T) {
	err := Ping(context.Background(), nil)
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestPingUnreachableBroker(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	err := Ping(ctx, []string{"127.0.0.1:1"})
	if err == nil {
		t.Fatal("expected dial error")
	}
	if !strings.Contains(err.Error(), "kafka dial") && !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("err=%v", err)
	}
}
