package kafka

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"sync/atomic"
	"testing"
	"time"

	"github.com/o-mid/engagepulse/internal/domain"
)

type memDLQ struct {
	calls    int
	last     DeadLetter
	failNext bool
}

func (m *memDLQ) PublishDLQ(_ context.Context, evt domain.Event, reason string, attempts int) error {
	m.calls++
	m.last = DeadLetter{Event: evt, Error: reason, Attempts: attempts}
	if m.failNext {
		return errors.New("dlq unavailable")
	}
	return nil
}

func TestProcessEventRetryThenSuccess(t *testing.T) {
	var calls atomic.Int32
	c := &Consumer{
		logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
		handler: func(context.Context, domain.Event) error {
			n := calls.Add(1)
			if n < 2 {
				return errors.New("transient")
			}
			return nil
		},
		maxAttempts: 3,
		backoff:     time.Millisecond,
	}
	err := c.processEvent(context.Background(), domain.Event{EventID: "e-retry"})
	if err != nil {
		t.Fatalf("process: %v", err)
	}
	if calls.Load() != 2 {
		t.Fatalf("calls=%d want 2", calls.Load())
	}
}

func TestProcessEventPermanentFailureGoesToDLQ(t *testing.T) {
	dlq := &memDLQ{}
	var calls atomic.Int32
	c := &Consumer{
		logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
		handler: func(context.Context, domain.Event) error {
			calls.Add(1)
			return errors.New("permanent")
		},
		dlq:         dlq,
		maxAttempts: 3,
		backoff:     time.Millisecond,
	}
	evt := domain.Event{EventID: "e-dlq", TenantID: "acme-casino", PlayerID: "p1"}
	if err := c.processEvent(context.Background(), evt); err != nil {
		t.Fatalf("process: %v", err)
	}
	if calls.Load() != 3 {
		t.Fatalf("calls=%d want 3", calls.Load())
	}
	if dlq.calls != 1 {
		t.Fatalf("dlq calls=%d want 1", dlq.calls)
	}
	if dlq.last.Event.EventID != "e-dlq" || dlq.last.Attempts != 3 {
		t.Fatalf("dlq payload=%#v", dlq.last)
	}
}

func TestProcessEventDLQFailureDoesNotSucceed(t *testing.T) {
	dlq := &memDLQ{failNext: true}
	c := &Consumer{
		logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
		handler: func(context.Context, domain.Event) error {
			return errors.New("permanent")
		},
		dlq:         dlq,
		maxAttempts: 2,
		backoff:     time.Millisecond,
	}
	err := c.processEvent(context.Background(), domain.Event{EventID: "e-dlq-fail"})
	if err == nil {
		t.Fatal("expected error when dlq publish fails")
	}
}
