# Architecture

EngagePulse is **one Go binary** that:

- accepts signed player events over HTTP
- stores them in a Postgres **outbox**
- publishes outbox rows to **Kafka** (Redpanda in local Compose)
- consumes those events in-process
- applies engagement rules and ledger credits
- exposes the resulting player snapshot over **REST + gRPC**

If you are new to the product words (VIP, welcome offer, velocity), read [concepts.md](./concepts.md) first.

## Why one binary

The interview-relevant pieces are the event contract, outbox, idempotent processing, and ledger uniqueness — not a service mesh. Package boundaries already separate ingest, outbox, Kafka, rules, and ledger. Splitting API vs worker into two deployables later is a packaging choice.

## Request path (detailed)

```text
Partner / loadgen
  │
  ▼
POST /v1/events
  • validate JSON + event type/amount
  • resolve tenant; verify HMAC on raw body
  • BEGIN tx: ensure player rows + INSERT outbox (unique tenant_id+event_id)
  • COMMIT → HTTP 202 Accepted
  │
  ▼
Outbox publisher (goroutine)
  • reclaim stale "publishing" rows after crashes
  • claim pending rows (SKIP LOCKED)
  • Publish to Kafka topic player.events
  • mark published (or return to pending on failure)
  │
  ▼
Kafka consumer (goroutine)
  • fetch message
  • handler = worker.Handle
  • on failure: retry with backoff (3 attempts)
  • still failing: write DeadLetter to player.events.dlq, then commit
  │
  ▼
Worker
  • mark processed_events (dedupe)
  • load player_state
  • rules: welcome → VIP → integrity
  • optional ledger credit (unique tenant_id+event_id)
  │
  ▼
GET /v1/players/{id}  or  gRPC GetPlayer
  • auth via tenant API key
  • return VIP, offers, integrity flag, balance
```

## Why Kafka (Redpanda locally)

Kafka is a durable **activity stream**. Producers append; consumers catch up independently.

- HTTP does not wait for rule evaluation.
- The worker can restart and continue from the consumer group offset.
- Bursts of bets do not block ingest.

Locally we run **Redpanda** because it speaks the Kafka protocol and fits Compose. Production would use a managed Kafka-compatible cluster the same way.

## Outbox (durable accept, async publish)

**Problem without an outbox:** if the API published to Kafka and then crashed (or Kafka was briefly down), you get ambiguous “did we accept this event?” behaviour.

**What we do instead:**

1. `POST /v1/events` returns **202 only after** a successful outbox insert (and player ensure) in one transaction.
2. A background publisher drains `pending` rows to Kafka.
3. Unique `(tenant_id, event_id)` makes partner retries idempotent at the outbox layer.
4. Rows stuck in `publishing` after a crash are **reclaimed** back to `pending` before the next claim (safe with a single in-process publisher).

Code: `internal/store/outbox.go`, `internal/outbox/publisher.go`.

## Consumer retries and DLQ

**Problem:** handlers fail (DB blip, bug, poison payload). Silently skipping loses events; infinite retry blocks the partition forever.

**What we do:**

1. Retry the same event up to **3** times with short backoff.
2. If still failing, publish a **dead-letter** JSON document to `player.events.dlq` (override with `KAFKA_DLQ_TOPIC`) containing the original event, error string, and attempt count.
3. Commit the original offset only after success **or** successful DLQ write.
4. If DLQ publish fails, **do not commit** — the message can be redelivered.

Prometheus: `engagepulse_consumer_retries_total`, `engagepulse_consumer_dlq_total`.

Code: `internal/kafka/consumer.go`, `internal/kafka/dlq.go`.

## Why ledger keys are `(tenant_id, event_id)`

Reward credits are money-adjacent. Kafka and consumers are at-least-once, so the same event can be handled more than once.

The ledger insert is uniquely keyed by `(tenant_id, event_id)`. A second credit attempt becomes `ErrDuplicateCredit` and leaves the balance unchanged.

## Rules engine (product logic)

Order matters and is fixed:

1. **Welcome offer** on first deposit → tag + credit 100  
2. **VIP score** on bets → update score/tier  
3. **Integrity velocity** on bet bursts → set flag  

Details and thresholds: [concepts.md](./concepts.md). Code: `internal/rules`.

## Tenancy and auth

| Surface | Auth |
| --- | --- |
| `POST /v1/events` | HMAC `X-Signature` with tenant secret over raw body |
| `GET /v1/players/{id}` | `X-API-Key` |
| gRPC `GetPlayer` | metadata `x-api-key` |

Unknown tenant and bad HMAC both return **401** so callers cannot cheaply probe tenant ids. gRPC ignores a mismatched `tenant_id` in the request and always uses the authenticated tenant.

Seed tenants `acme-casino` and `nova-sports` are local-demo only (see `.env.example`).

## Schema migrations under parallel tests

`store.Migrate` takes a Postgres **advisory lock** so concurrent packages in `go test ./...` do not race DDL. CI also runs `go test ./... -p 1` as a belt-and-suspenders serialisation.

## What is intentionally out of scope

- Game clients / web UI
- Real payments, KYC, or licensed gambling flows
- Multi-publisher outbox claiming across many nodes (would need leasing beyond reclaim)
- ML personalisation
- Full fraud case management UI for DLQ messages
