package kafka

import (
	"context"

	"github.com/o-mid/engagepulse/internal/domain"
)

// MemoryPublisher is a temporary in-process publisher used until Kafka wiring lands.
type MemoryPublisher struct {
	ch chan domain.Event
}

func NewMemoryPublisher(buffer int) *MemoryPublisher {
	return &MemoryPublisher{ch: make(chan domain.Event, buffer)}
}

func (p *MemoryPublisher) Publish(_ context.Context, evt domain.Event) error {
	select {
	case p.ch <- evt:
		return nil
	default:
		p.ch <- evt
		return nil
	}
}

func (p *MemoryPublisher) Chan() <-chan domain.Event {
	return p.ch
}
