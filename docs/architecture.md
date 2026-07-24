# How the app is built (simple)

EngagePulse is **one Go program**. When it runs it:

1. Accepts player events over HTTP
2. Saves them in Postgres
3. Puts them on a message stream (Kafka; locally we use Redpanda)
4. Reads those messages and runs the three rules
5. Lets you read the player result over HTTP or gRPC

If VIP / welcome bonus / velocity are new words, read [concepts.md](./concepts.md) first.

## Why one program

The useful parts are:

- safe accept of events
- message stream
- rules
- bonus credits that do not double-pay

We keep that in one binary so the demo stays easy to run. Later you could split “API” and “worker” into two processes if needed.

## The path of one event

```text
loadgen / partner
   |
   v
POST /v1/events
   - check JSON
   - check brand secret (HMAC signature)
   - save row in outbox table
   - reply 202 Accepted
   |
   v
Outbox publisher (background)
   - take pending rows
   - send to Kafka topic player.events
   - mark row published
   |
   v
Kafka consumer (background)
   - read message
   - run worker
   - if worker fails: try again up to 3 times
   - if still failing: send copy to player.events.dlq, then move on
   |
   v
Worker
   - remember event id (skip if seen)
   - run welcome → VIP → velocity rules
   - maybe add bonus credit
   |
   v
GET /v1/players/{id}  or  gRPC GetPlayer
   - needs brand API key
   - returns VIP, tags, flag, balance
```

## What Kafka is here

Kafka is a **log of messages**.

- Writers append events.
- Readers process them in order (per group).
- If the worker restarts, it can continue where it left off.

Locally, **Redpanda** is a smaller tool that speaks the same Kafka style of API.

## Outbox (save first, send later)

**Problem:** if we send to Kafka and the app dies, it is unclear whether the event was accepted.

**What we do:**

1. Save the event in an `outbox` table first.
2. Only then reply `202`.
3. A background loop sends pending rows to Kafka.
4. Same `event_id` cannot be inserted twice for the same brand.

If the app crashes while sending, rows stuck as “publishing” are put back to “pending” and tried again.

The gauge `engagepulse_outbox_pending` shows how many rows are still waiting (or mid-send).
The demo script waits until that gauge is `0` and processed events catch up to accepted ones before printing player JSON.

Code: `internal/store/outbox.go`, `internal/outbox/publisher.go`.

## Retries and the dead-letter topic (DLQ)

**Problem:** sometimes processing fails (DB blip, bad data, bug).

**What we do:**

1. Try the same event up to **3** times.
2. If it still fails, write a “dead letter” message to `player.events.dlq` with:
   - the original event
   - the error text
   - how many tries we used
3. Only then mark the original Kafka message as done.
4. If even the DLQ write fails, we do **not** mark it done, so Kafka can deliver it again.

Code: `internal/kafka/consumer.go`, `internal/kafka/dlq.go`.

## Why bonus credits use a unique event id

The stream may deliver the same event more than once.

The bonus table has a unique key on `(tenant_id, event_id)`.
A second credit for the same event is rejected, so the balance does not jump by another 100.

## Rules order

Always:

1. Welcome bonus (first deposit)
2. VIP score (bets)
3. Velocity flag (many bets quickly)

Details: [concepts.md](./concepts.md). Code: `internal/rules`.

## Login / keys

| Call | How you prove who you are |
| --- | --- |
| `POST /v1/events` | Header `X-Signature` (HMAC of the raw body) |
| `GET /v1/players/{id}` | Header `X-API-Key` |
| gRPC `GetPlayer` | metadata `x-api-key` |

Unknown brand and bad signature both return **401** (same answer on purpose).

Demo brands and keys are only for local use (see `.env.example`).

## Tests and migrations

Several test packages talk to the same Postgres.
`Migrate` takes a database lock so they do not fight while creating tables.
CI also runs tests one package at a time (`go test ./... -p 1`).

## Not in this project

- Game UI / website for players
- Real money payments
- Full fraud team tools for DLQ messages
- Machine-learning “personal offers”
