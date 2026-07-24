# EngagePulse

Multi-tenant player engagement service for simulated iGaming brands.

Ingest signed player activity, apply a small rules set (welcome offer, VIP score, integrity velocity), and credit rewards once — even when Kafka redelivers.

## Quick start

```bash
cp .env.example .env
docker compose up -d
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
| `make test` | Unit + optional DB tests |

Set `DATABASE_URL` to run ledger and worker integration tests against Postgres.

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
