# Concepts (no prior iGaming knowledge assumed)

EngagePulse is a small backend that turns raw player activity into **engagement state** and **safe reward credits**. This page explains the product words used in the code and demos.

## Multi-tenant (white-label)

A **tenant** is one brand on the shared platform (seed examples: `acme-casino`, `nova-sports`).

- Each tenant has its own players, balances, VIP scores, and flags.
- Tenants authenticate reads with an API key and sign ingest with an HMAC secret.
- Data is never shared across tenants: every query is scoped by `tenant_id`.

Think “one codebase, many casinos,” not one global leaderboard.

## Player activity events

Upstream systems (games, payments, sessions) send **events**. This service does not run the games; it reacts to what already happened.

| Event type | Meaning in plain language |
| --- | --- |
| `deposit` | Player added funds (or an equivalent credit) |
| `bet_placed` | Player staked money on a round/wager |
| `session_heartbeat` | Player is still active in a session (kept for realism; rules mostly ignore it today) |

Each event has a stable `event_id`. Retries must reuse the same id so the system can stay idempotent.

## Engagement / “gamification” in this repo

In product language, **engagement** means keeping players interested with status, offers, and trust controls. EngagePulse implements three tiny rules that show the pattern:

### 1. Welcome offer (acquisition)

- **Goal:** reward a player’s first deposit.
- **Effect:** tag the player with `welcome_bonus` and credit **100** fake reward units once.
- **Why it matters:** money-adjacent actions must be idempotent — replaying the same deposit must not pay twice.

### 2. VIP score / tier (value & personalisation)

- **Goal:** recognise heavier play with a status tier.
- **How:** each `bet_placed` adds `amount` to a running **score**.
- **Tiers:**
  - `bronze` — below 1000
  - `silver` — score ≥ 1000
  - `gold` — score ≥ 5000
- **Why it matters:** personalisation is often just durable counters + thresholds, not ML.

### 3. Integrity / velocity flag (platform trust)

- **Goal:** mark suspicious burst betting for review.
- **How:** if a player places **5+ bets within about one minute**, set `integrity_flag = velocity`.
- **What it is not:** a full fraud engine. It does not block play in v0.1; it records a signal ops can act on.
- **Why it matters:** engagement platforms must balance rewards with abuse controls.

## Reward balance vs real money

The **balance** in player snapshots is a **reward ledger** (bonus credits), not a full casino wallet or fiat account.

- Credits use a ledger table with unique `(tenant_id, event_id)`.
- That uniqueness is what makes Kafka redelivery safe for money-like effects.

## End-to-end path (product view)

1. Partner sends a signed event for a tenant’s player.
2. API accepts it only after it is stored durably (outbox).
3. Publisher pushes the event onto the activity stream (Kafka).
4. Worker applies the three rules and may credit the ledger.
5. Ops/product reads the player snapshot (VIP, offers, integrity flag, balance) over REST or gRPC.

## Demo tenants (what you should see)

| Tenant | Demo intent | Typical snapshot signals |
| --- | --- | --- |
| `acme-casino` | VIP / welcome path | `welcome_bonus`, higher VIP tier, balance 100 |
| `nova-sports` | Integrity path | `welcome_bonus`, `integrity_flag: velocity`, balance 100 |

Exact VIP tier depends on bet amounts in the loadgen run; the important part is that the two tenants diverge for different reasons.
