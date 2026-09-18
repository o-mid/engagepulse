package tracing

import (
	"context"
	"testing"

	"go.opentelemetry.io/otel/trace"
)

func TestSetupProducesValidTraceID(t *testing.T) {
	tp, err := Setup()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_ = tp.Shutdown(context.Background())
	})
	ctx, span := Start(context.Background(), "test")
	defer span.End()
	id := TraceID(ctx)
	if len(id) != 32 {
		t.Fatalf("trace id len=%d want 32", len(id))
	}
	if _, err := trace.TraceIDFromHex(id); err != nil {
		t.Fatalf("hex: %v", err)
	}
}

func TestContextWithTraceID(t *testing.T) {
	id := newTraceID()
	ctx := ContextWithTraceID(context.Background(), id)
	got := trace.SpanContextFromContext(ctx).TraceID().String()
	if got != id {
		t.Fatalf("got %s want %s", got, id)
	}
}
