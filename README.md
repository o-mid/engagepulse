# EngagePulse

v0.1.0 — multi-tenant player engagement service for simulated iGaming brands.

Ingest signed player activity, apply a small rules set (welcome offer, VIP score, integrity velocity), and credit rewards once — even when Kafka redelivers.

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

CI sets `DATABASE_URL` against a Postgres service so ledger and worker tests run in Actions.

## Capability map

| Capability | Where to look |
| --- | --- |
| Multi-tenant isolation | `migrations/`, `internal/store`, API key middleware |
| Signed ingest | `internal/ingest`, `POST /v1/events` |
| Event stream | `internal/kafka`, Compose Redpanda |
| Rules / scoring / integrity | `internal/rules` |
| Ledger-safe credits | `internal/ledger`, unique `(tenant_id, event_id)` |
| REST + gRPC reads | `internal/api/httpapi`, `internal/api/grpcapi` |
| Observability | structured logs in `internal/app`, `/metrics` |
| Local demo | `make demo`, `cmd/loadgen`, `scripts/demo.sh` |

## Docs

- [Architecture](docs/architecture.md)
