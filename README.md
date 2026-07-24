# EngagePulse

v0.1.0 — multi-tenant **player engagement** backend for simulated iGaming brands.

Partners send signed player activity (`deposit`, `bet_placed`, `session_heartbeat`). EngagePulse stores each event durably, publishes it on a Kafka stream, applies a small rules set (welcome offer, VIP score, integrity velocity), and credits rewards **once** — even when messages are redelivered.

New to VIP / welcome offers / velocity flags? Start with [docs/concepts.md](docs/concepts.md).

## Quick start

Prefer local `make run` against Compose Postgres + Redpanda. The Compose app image may need `GOPROXY` if Docker cannot reach `proxy.golang.org`.

```bash
cp .env.example .env
docker compose up -d postgres redpanda
make migrate
make run
```

In another terminal:

```bash
make demo
```

`make demo` sends traffic for both seed tenants and prints player snapshots (VIP / integrity / balance).

## Demo

~30s terminal recording of `make demo`: acme VIP/welcome + nova velocity player snapshots, then `/metrics` ingest/process counts.

- Video (browser-playable): [engagepulse-demo-v0.1.0.mp4](https://github.com/o-mid/engagepulse/releases/download/v0.1.0/engagepulse-demo-v0.1.0.mp4)
- Asciinema source: [engagepulse-demo-v0.1.0.cast](https://github.com/o-mid/engagepulse/releases/download/v0.1.0/engagepulse-demo-v0.1.0.cast) (`asciinema play engagepulse-demo-v0.1.0.cast`)

> Recordings on the `v0.1.0` release show the happy path. After outbox + DLQ land on `develop`/`main`, re-record and attach updated assets (see release notes) so the video matches the current ingest path.

Reproduce locally:

```bash
docker compose up -d postgres redpanda
make migrate
make run
# other terminal:
make demo
```

## What you are looking at

| Idea | In this repo |
| --- | --- |
| White-label brands | Tenants `acme-casino` and `nova-sports` |
| Player activity stream | Kafka topic `player.events` (Redpanda locally) |
| Safe accept under failure | Postgres **outbox**, then async publish |
| Poison / repeated handler failures | Retries + DLQ topic `player.events.dlq` |
| Welcome bonus | First deposit → tag + ledger credit 100 |
| VIP status | Bet amounts raise score → bronze/silver/gold |
| Integrity signal | Burst betting → `velocity` flag |
| No double pay | Ledger unique `(tenant_id, event_id)` |

## Surfaces

| Surface | Path |
| --- | --- |
| Ingest | `POST /v1/events` (HMAC `X-Signature`) |
| Player read | `GET /v1/players/{id}` (`X-API-Key`) |
| gRPC | `GetPlayer` (metadata `x-api-key`) |
| Health | `GET /healthz` |
| Metrics | `GET /metrics` |

## Local tooling

| Command | Purpose |
| --- | --- |
| `make up` | Postgres + Redpanda |
| `make migrate` / `make seed` | Schema + seed tenants |
| `make loadgen` | Signed event traffic |
| `make demo` | End-to-end happy path |
| `make test` | Unit + DB tests (set `DATABASE_URL`) |

CI sets `DATABASE_URL` against a Postgres service and runs `go test ./... -p 1` so ledger/worker/outbox tests execute without parallel migrate races.

## Capability map

| Capability | Where to look |
| --- | --- |
| Product concepts (VIP, offers, integrity) | [docs/concepts.md](docs/concepts.md) |
| End-to-end architecture | [docs/architecture.md](docs/architecture.md) |
| Multi-tenant isolation | `migrations/`, `internal/store`, API key middleware |
| Signed ingest | `internal/ingest`, `POST /v1/events` |
| Outbox publish | `internal/store/outbox.go`, `internal/outbox` |
| Event stream + DLQ | `internal/kafka`, topics `player.events` / `player.events.dlq` |
| Rules / scoring / integrity | `internal/rules` |
| Ledger-safe credits | `internal/ledger`, unique `(tenant_id, event_id)` |
| REST + gRPC reads | `internal/api/httpapi`, `internal/api/grpcapi` |
| Observability | structured logs in `internal/app`, `/metrics` |
| Local demo | `make demo`, `cmd/loadgen`, `scripts/demo.sh` |

## Docs

- [Concepts](docs/concepts.md) — gamification / iGaming vocabulary
- [Architecture](docs/architecture.md) — outbox, Kafka, retries, DLQ, ledger
