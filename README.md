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

## Docs

- [Architecture](docs/architecture.md)
