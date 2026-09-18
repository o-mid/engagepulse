# EngagePulse console (web)

Next.js App Router console for the Go service. HMAC is signed in the BFF. The browser never holds secrets.

## Pages

| Path | What a hiring manager sees |
| --- | --- |
| `/` | Arena. Dual-tenant stage (`acme-casino` VIP vs `nova-sports` velocity). Ignite runs HMAC, outbox, Kafka, worker tx, then GET player. |
| `/architecture` | Live counters and the event path. Select a node. Dead letters: last N from Kafka; Redrive is a human-clicked signed ingest of the same event_id. |
| `/contract` | Run contract: duplicate credit-once, `credit`/`set_vip` 404, Nova cannot read an Acme player, shadow no-write, poison→DLQ when inject is on. Replay / tools / shadow tabs. |

Tab URLs: `/contract?tab=tools`, `/contract?tab=shadow`.

Shadow, tools, and replay are clients of the ledger. The credit path has no LLM. Nothing in this UI sets VIP or balance.

## Run

From repo root:

```bash
docker compose up -d postgres redpanda
make migrate
make run
```

In another terminal:

```bash
cd web
cp .env.local.example .env.local   # if needed
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Ignite live demo**.

## Hosted demo

| Piece | URL |
| --- | --- |
| Console | [https://engagepulse-topaz.vercel.app](https://engagepulse-topaz.vercel.app) |
| Go API | `https://api-production-2ef9b.up.railway.app` |

If the API is unreachable, Arena and Architecture show an offline banner with a link to the recorded `v0.3.0` Arena mp4.

### Vercel env

| Variable | Value |
| --- | --- |
| `ENGAGEPULSE_URL` | `https://api-production-2ef9b.up.railway.app` |
| `ACME_API_KEY` / `ACME_HMAC_SECRET` | demo keys from `.env.local.example` |
| `NOVA_API_KEY` / `NOVA_HMAC_SECRET` | demo keys from `.env.local.example` |

Stale laptop tunnel URLs (`trycloudflare`, `ngrok`, etc.) in `ENGAGEPULSE_URL` are ignored; the BFF falls back to the hosted Railway API.

## Demo recordings

Screen captures are on GitHub release **`v0.3.0`**. Links live in the root [README Demo video](../README.md#demo-video) section.
