# Simple guide: what this project is about

EngagePulse is a small backend for **fake online casino / sports brands**.

Games and payments send it short messages like “player deposited” or “player placed a bet”.
EngagePulse then updates that player’s status and may add a **bonus reward**.

You do **not** need casino experience to read this. Plain meanings below.

## Two brands in the demo

The demo has two brands sharing one app:

| Brand id | What the demo shows |
| --- | --- |
| `acme-casino` | Welcome bonus + VIP level going up |
| `nova-sports` | Welcome bonus + a “betting too fast” warning flag |

Each brand only sees its own players. Mixing data across brands is not allowed.

## What is a “tenant”?

A **tenant** = one brand (one casino or sportsbook name).

- Each brand has its own API key (to read player info).
- Each brand has its own secret (to sign events).
- Player scores and balances stay inside that brand.

## What is an “event”?

An **event** is a small JSON message about something a player did.

| Event type | Simple meaning |
| --- | --- |
| `deposit` | Player put money in |
| `bet_placed` | Player made a bet |
| `session_heartbeat` | Player is still online (almost unused by rules today) |

Every event has an `event_id`. If the sender retries, it should reuse the **same** id so we do not apply the bonus twice.

## The three rules (the “game” part)

### 1. Welcome bonus

- Trigger: first `deposit` for that player.
- Result: tag `welcome_bonus` + add **100** to reward balance.
- If the same deposit is sent again: keep the tag, **do not** add another 100.

### 2. VIP level

- Trigger: each `bet_placed`.
- The bet amount is added to a **score**.
- Levels:
  - `bronze` — score under 1000
  - `silver` — score 1000 or more
  - `gold` — score 5000 or more

VIP here is just a status label from that score. Not a real loyalty product.

### 3. “Too fast” flag (integrity / velocity)

- Trigger: about **5 or more bets in one minute**.
- Result: set `integrity_flag` to `velocity`.
- This is a **warning mark** for later review. It does not stop the player in this version.

## Reward balance (not real cash)

The `balance` field is **bonus points / reward credits** for the demo.

It is **not**:

- real bank money
- a full casino wallet
- crypto custody

We still treat it carefully: the same event must never pay the bonus twice.

## How a message moves through the app

1. Brand sends a signed event to `POST /v1/events`.
2. App saves it in the database first (outbox table).
3. A background job puts it on the message stream (Kafka / Redpanda).
4. A worker reads it and runs the three rules.
5. You read the player with `GET /v1/players/{id}` (API key required).

## What “good” looks like in `make demo`

**Acme player** (`load-acme-casino-0`):

- has `welcome_bonus`
- VIP is usually `silver` or `gold` (depends on bet sizes in the run)
- `balance` is `100`

**Nova player** (`load-nova-sports-0`):

- has `welcome_bonus`
- VIP often stays `bronze` (small bets)
- `integrity_flag` is `velocity` (many bets quickly)
- `balance` is `100`

If both players look different for clear reasons, the demo worked.
