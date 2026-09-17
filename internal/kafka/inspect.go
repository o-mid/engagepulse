package kafka

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	kafkago "github.com/segmentio/kafka-go"
)

const maxInspect = 100

// Inspector reads recent dead letters from a DLQ topic.
type Inspector struct {
	topic   string
	brokers []string
}

func NewInspector(brokers []string, topic string) *Inspector {
	copied := make([]string, len(brokers))
	copy(copied, brokers)
	return &Inspector{topic: topic, brokers: copied}
}

func (i *Inspector) Recent(ctx context.Context, n int) ([]DeadLetter, error) {
	if i == nil {
		return nil, nil
	}
	return ReadRecent(ctx, i.brokers, i.topic, n)
}

// ReadRecent returns the last n dead letters, newest first.
func ReadRecent(ctx context.Context, brokers []string, topic string, n int) ([]DeadLetter, error) {
	if len(brokers) == 0 {
		return nil, fmt.Errorf("kafka brokers required")
	}
	topic = strings.TrimSpace(topic)
	if topic == "" {
		return nil, fmt.Errorf("dlq topic required")
	}
	if n <= 0 {
		n = 20
	}
	if n > maxInspect {
		n = maxInspect
	}
	if err := EnsureTopic(brokers, topic); err != nil {
		return nil, err
	}

	dialCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	conn, err := kafkago.DialContext(dialCtx, "tcp", brokers[0])
	if err != nil {
		return nil, fmt.Errorf("dlq dial: %w", err)
	}
	defer func() { _ = conn.Close() }()
	parts, err := conn.ReadPartitions(topic)
	if err != nil {
		return nil, fmt.Errorf("dlq partitions: %w", err)
	}

	all := make([]DeadLetter, 0, n)
	seen := map[int]struct{}{}
	for _, p := range parts {
		if p.Topic != topic {
			continue
		}
		if _, ok := seen[p.ID]; ok {
			continue
		}
		seen[p.ID] = struct{}{}
		var batch []DeadLetter
		batch, err = readPartitionRecent(ctx, brokers, topic, p.ID, n)
		if err != nil {
			return nil, err
		}
		all = append(all, batch...)
	}
	sort.SliceStable(all, func(i, j int) bool {
		if all[i].FailedAt.Equal(all[j].FailedAt) {
			return all[i].Event.EventID > all[j].Event.EventID
		}
		return all[i].FailedAt.After(all[j].FailedAt)
	})
	if len(all) > n {
		all = all[:n]
	}
	return all, nil
}

func readPartitionRecent(ctx context.Context, brokers []string, topic string, partition, n int) ([]DeadLetter, error) {
	dialCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	conn, err := kafkago.DialLeader(dialCtx, "tcp", brokers[0], topic, partition)
	if err != nil {
		return nil, fmt.Errorf("dlq dial partition %d: %w", partition, err)
	}
	first, last, err := conn.ReadOffsets()
	_ = conn.Close()
	if err != nil {
		return nil, fmt.Errorf("dlq offsets partition %d: %w", partition, err)
	}
	// ReadLastOffset is the high watermark (next offset to be written).
	if last <= first {
		return nil, nil
	}
	start := last - int64(n)
	if start < first {
		start = first
	}
	want := int(last - start)

	r := kafkago.NewReader(kafkago.ReaderConfig{
		Brokers:   brokers,
		Topic:     topic,
		Partition: partition,
		MinBytes:  1,
		MaxBytes:  10e6,
		MaxWait:   time.Second,
	})
	defer func() { _ = r.Close() }()
	if err = r.SetOffset(start); err != nil {
		return nil, fmt.Errorf("dlq seek partition %d: %w", partition, err)
	}

	out := make([]DeadLetter, 0, want)
	for len(out) < want {
		var msg kafkago.Message
		msg, err = r.ReadMessage(ctx)
		if err != nil {
			return nil, fmt.Errorf("dlq read partition %d: %w", partition, err)
		}
		var dl DeadLetter
		dl, err = ParseDeadLetter(msg.Value)
		if err != nil {
			continue
		}
		out = append(out, dl)
	}
	return out, nil
}
