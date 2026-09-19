package tracing

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"io"
	"os"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	"go.opentelemetry.io/otel/trace"
)

const TracerName = "engagepulse"

func Setup() (*sdktrace.TracerProvider, error) {
	var w io.Writer = io.Discard
	if os.Getenv("OTEL_TRACES") == "stdout" {
		w = os.Stdout
	}
	exp, err := stdouttrace.New(stdouttrace.WithWriter(w))
	if err != nil {
		return nil, err
	}
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exp),
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
		sdktrace.WithResource(resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceName("engagepulse"),
		)),
	)
	otel.SetTracerProvider(tp)
	return tp, nil
}

func Start(ctx context.Context, name string, attrs ...attribute.KeyValue) (context.Context, trace.Span) {
	return otel.Tracer(TracerName).Start(ctx, name, trace.WithAttributes(attrs...))
}

func EventAttrs(eventID, tenantID string) []attribute.KeyValue {
	return []attribute.KeyValue{
		attribute.String("event_id", eventID),
		attribute.String("tenant_id", tenantID),
	}
}

func TraceID(ctx context.Context) string {
	sc := trace.SpanContextFromContext(ctx)
	if sc.IsValid() {
		return sc.TraceID().String()
	}
	return newTraceID()
}

func ContextWithTraceID(ctx context.Context, id string) context.Context {
	tid, err := trace.TraceIDFromHex(id)
	if err != nil {
		return ctx
	}
	sc := trace.NewSpanContext(trace.SpanContextConfig{
		TraceID:    tid,
		SpanID:     newSpanID(),
		TraceFlags: trace.FlagsSampled,
		Remote:     true,
	})
	if !sc.IsValid() {
		return ctx
	}
	return trace.ContextWithRemoteSpanContext(ctx, sc)
}

func newTraceID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return hex.EncodeToString(make([]byte, 16))
	}
	return hex.EncodeToString(b[:])
}

func newSpanID() trace.SpanID {
	var b [8]byte
	_, _ = rand.Read(b[:])
	return trace.SpanID(b)
}
