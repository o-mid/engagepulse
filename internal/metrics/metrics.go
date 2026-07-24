package metrics

import (
	"net/http"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
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
)

func Handler() http.Handler {
	return promhttp.Handler()
}
