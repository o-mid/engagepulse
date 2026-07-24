# Architecture

EngagePulse is one Go binary that exposes REST + gRPC and runs a Kafka consumer in-process.

## Why one binary

The interesting parts are the event contract, idempotent processing, and ledger uniqueness — not service mesh ceremony. Splitting API and worker later is a deploy choice; the package boundaries already keep ingest, rules, and ledger separate.

## Why Kafka (Redpanda locally)

Ingest acknowledges after the event is durably written to an outbox row. An in-process publisher drains the outbox to Kafka. The worker can catch up after restarts and process bursts without coupling HTTP latency to rule evaluation. Redpanda keeps local Compose small while preserving the Kafka protocol.

## Outbox

`POST /v1/events` returns 202 only after a unique `(tenant_id, event_id)` outbox insert (and player ensure) commit. Kafka publish happens asynchronously from the outbox loop. Duplicate ingest retries are idempotent at the outbox unique key. The publisher reclaims rows left in `publishing` after a process crash before claiming the next batch (single in-process publisher).

## Consumer retries and DLQ

On handler errors the consumer retries the same message with short bounded backoff (3 attempts). If still failing, it publishes to Kafka topic `player.events.dlq` (override with `KAFKA_DLQ_TOPIC`) including the original event, error, and attempt count, then commits the original offset. If the DLQ write fails, the offset is not committed so the message can be redelivered. Future work: poison-pill quarantine UI, per-tenant retry budgets, and outbox→Kafka delivery metrics dashboards.

## Why ledger keys are `(tenant_id, event_id)`

Reward credits must survive redelivery. Unique ledger keys make duplicate Kafka deliveries a no-op at the money path even if application-level dedupe is skipped or raced.

## Request path

1. `POST /v1/events` verifies HMAC with the tenant secret and writes the event to the outbox.
2. The outbox publisher publishes pending rows to Kafka and marks them published.
3. The worker marks `(tenant_id, event_id)` processed, applies three rules, and may credit the ledger.
4. `GET /v1/players/{id}` and gRPC `GetPlayer` return the same snapshot (VIP, offers, integrity flag, balance), scoped by tenant API key.

## Tenancy

Every row and every read is tenant-scoped. Seed tenants `acme-casino` and `nova-sports` demonstrate isolated state under the same process.
