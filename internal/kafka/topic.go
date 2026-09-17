package kafka

import (
	"fmt"
	"strings"
	"time"

	kafkago "github.com/segmentio/kafka-go"
)

func EnsureTopic(brokers []string, topic string) error {
	if len(brokers) == 0 {
		return fmt.Errorf("kafka brokers required")
	}
	topic = strings.TrimSpace(topic)
	if topic == "" {
		return fmt.Errorf("kafka topic required")
	}
	var last error
	for i := 0; i < 8; i++ {
		last = createTopic(brokers[0], topic)
		if last == nil {
			return nil
		}
		time.Sleep(250 * time.Millisecond)
	}
	return last
}

func createTopic(broker, topic string) error {
	conn, err := kafkago.Dial("tcp", broker)
	if err != nil {
		return fmt.Errorf("kafka dial: %w", err)
	}
	defer func() { _ = conn.Close() }()
	controller, err := conn.Controller()
	if err != nil {
		return fmt.Errorf("kafka controller: %w", err)
	}
	ctrl, err := kafkago.Dial("tcp", fmt.Sprintf("%s:%d", controller.Host, controller.Port))
	if err != nil {
		return fmt.Errorf("kafka controller dial: %w", err)
	}
	defer func() { _ = ctrl.Close() }()
	err = ctrl.CreateTopics(kafkago.TopicConfig{
		Topic:             topic,
		NumPartitions:     1,
		ReplicationFactor: 1,
	})
	if err != nil && !topicExists(err) {
		return fmt.Errorf("create topic %s: %w", topic, err)
	}
	return nil
}

func topicExists(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "already exists") || strings.Contains(msg, "topic already present")
}
