# EngagePulse

Small Go backend for **casino / sports brands**.

Other systems send player actions (deposit, bet). EngagePulse updates that player’s VIP status, welcome bonus, and warning flags, and may add a reward balance of **100** once.

## Quick start

Use the app on your machine. Start only Postgres + Redpanda in Docker.
The app listens on `127.0.0.1` by default (avoids `localhost` → IPv6 confusion).

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

`make demo` explains each step, sends traffic for two brands, then prints both player results.

> If the Compose **app image** fails to build (module download blocked in Docker), that is fine. Local `make run` is the normal path.

## Demo video

About 30 seconds of terminal output for `make demo` (two brands + player JSON + counters).

**Latest release `v0.2.1`:**

- Video: [engagepulse-demo-v0.2.1.mp4](https://github.com/o-mid/engagepulse/releases/download/v0.2.1/engagepulse-demo-v0.2.1.mp4)
- Text recording: [engagepulse-demo-v0.2.1.cast](https://github.com/o-mid/engagepulse/releases/download/v0.2.1/engagepulse-demo-v0.2.1.cast)  
  (`asciinema play engagepulse-demo-v0.2.1.cast`)

Run it yourself:

```bash
docker compose up -d postgres redpanda
make migrate
make run
# other terminal:
make demo
```

## What the demo brands show

| Brand | Meant to show | Look for |
| --- | --- | --- |
| `acme-casino` | Welcome bonus + VIP going up | `welcome_bonus`, VIP `silver` or `gold`, `balance: 100` |
| `nova-sports` | Betting too fast | `welcome_bonus`, `integrity_flag: velocity`, `balance: 100` |

## Plain map of ideas → code

| Idea | Where |
| --- | --- |
| Words like VIP / welcome / velocity | [docs/concepts.md](docs/concepts.md) |
| How messages move through the app | [docs/architecture.md](docs/architecture.md) |
| Two brands, separate data | `migrations/`, `internal/store` |
| Signed event intake | `internal/ingest`, `POST /v1/events` |
| Save first, send to stream later | `internal/store/outbox.go`, `internal/outbox` |
| Message stream + failed-message topic | `internal/kafka` |
| The three rules | `internal/rules` |
| Bonus credit without double-pay | `internal/ledger` |
| Read player over HTTP / gRPC | `internal/api/httpapi`, `internal/api/grpcapi` |

## HTTP / gRPC surfaces

| What | Path |
| --- | --- |
| Send event | `POST /v1/events` (header `X-Signature`) |
| Read player | `GET /v1/players/{id}` (header `X-API-Key`) |
| Read player (gRPC) | `GetPlayer` (metadata `x-api-key`) |
| Health | `GET /healthz` |
| Counters | `GET /metrics` |

## Make targets

| Command | What it does |
| --- | --- |
| `make up` | Start Postgres + Redpanda |
| `make migrate` | Create / update tables (+ seed brands) |
| `make loadgen` | Send signed events |
| `make demo` | Guided end-to-end run |
| `make test` | Tests (set `DATABASE_URL` for DB tests) |

## Docs

- [Simple concepts](docs/concepts.md)
- [How it is built](docs/architecture.md)
