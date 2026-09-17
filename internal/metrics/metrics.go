package metrics

import (
	"net/http"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	dto "github.com/prometheus/client_model/go"
)

var (
	EventsIngested = promauto.NewCounter(prometheus.CounterOpts{
		Name: "engagepulse_events_ingested_total",
		Help: "Events accepted by the ingest API",
	})
	EventsProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "engagepulse_events_processed_total",
		Help: "Events successfully processed by the worker",
	})
	RuleHits = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "engagepulse_rule_hits_total",
		Help: "Rule evaluations that produced a hit",
	}, []string{"rule"})
	LedgerCredits = promauto.NewCounter(prometheus.CounterOpts{
		Name: "engagepulse_ledger_credits_total",
		Help: "Successful ledger credit operations",
	})
	ConsumerRetries = promauto.NewCounter(prometheus.CounterOpts{
		Name: "engagepulse_consumer_retries_total",
		Help: "Consumer handler retry attempts after failure",
	})
	ConsumerDLQ = promauto.NewCounter(prometheus.CounterOpts{
		Name: "engagepulse_consumer_dlq_total",
		Help: "Events routed to the dead-letter topic after exhausted retries",
	})
	OutboxPending = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "engagepulse_outbox_pending",
		Help: "Outbox rows waiting to be published (pending or publishing)",
	})
	FailInject = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "engagepulse_fail_inject",
		Help: "1 when env-gated worker fail inject is enabled, else 0",
	})
)

type Snapshot struct {
	EventsIngested  float64 `json:"events_ingested_total"`
	EventsProcessed float64 `json:"events_processed_total"`
	LedgerCredits   float64 `json:"ledger_credits_total"`
	ConsumerRetries float64 `json:"consumer_retries_total"`
	ConsumerDLQ     float64 `json:"consumer_dlq_total"`
	OutboxPending   float64 `json:"outbox_pending"`
	FailInject      float64 `json:"fail_inject"`
}

func JSONSnapshot() Snapshot {
	return Snapshot{
		EventsIngested:  counterValue(EventsIngested),
		EventsProcessed: counterValue(EventsProcessed),
		LedgerCredits:   counterValue(LedgerCredits),
		ConsumerRetries: counterValue(ConsumerRetries),
		ConsumerDLQ:     counterValue(ConsumerDLQ),
		OutboxPending:   gaugeValue(OutboxPending),
		FailInject:      gaugeValue(FailInject),
	}
}

func counterValue(c prometheus.Counter) float64 {
	var m dto.Metric
	if err := c.Write(&m); err != nil {
		return 0
	}
	return m.GetCounter().GetValue()
}

func gaugeValue(g prometheus.Gauge) float64 {
	var m dto.Metric
	if err := g.Write(&m); err != nil {
		return 0
	}
	return m.GetGauge().GetValue()
}

func Handler() http.Handler {
	return promhttp.Handler()
}
