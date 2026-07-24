# Architecture

EngagePulse is one Go binary that exposes REST + gRPC and runs a Kafka consumer in-process.

## Why one binary

The interesting parts are the event contract, idempotent processing, and ledger uniqueness — not service mesh ceremony. Splitting API and worker later is a deploy choice; the package boundaries already keep ingest, rules, and ledger separate.

## Why Kafka (Redpanda locally)

Ingest acknowledges after the event is on the stream. The worker can retry, catch up after restarts, and process bursts without coupling HTTP latency to rule evaluation. Redpanda keeps local Compose small while preserving the Kafka protocol.

On handler errors the consumer currently logs and continues without committing; retry-with-backoff and a DLQ are the deliberate next step, not silent skip-as-success.

## Why ledger keys are `(tenant_id, event_id)`

Reward credits must survive redelivery. Unique ledger keys make duplicate Kafka deliveries a no-op at the money path even if application-level dedupe is skipped or raced.

## Request path

1. `POST /v1/events` verifies HMAC with the tenant secret and publishes to Kafka.
2. The worker marks `(tenant_id, event_id)` processed, applies three rules, and may credit the ledger.
3. `GET /v1/players/{id}` and gRPC `GetPlayer` return the same snapshot (VIP, offers, integrity flag, balance), scoped by tenant API key.

## Tenancy

Every row and every read is tenant-scoped. Seed tenants `acme-casino` and `nova-sports` demonstrate isolated state under the same process.
