# EngagePulse · Pulse Arena (web)

Creative Next.js console for the EngagePulse Go service.

## What it showcases

- Dual-tenant visual composition (Acme VIP vs Nova velocity)
- Canvas pulse field reacting to signed ingest
- Choreographed demo state machine (Framer Motion)
- BFF routes that HMAC-sign event bodies — secrets never hit the browser
- Live player snapshots + Prometheus counter parsing

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

Pages:

| Path | What |
| --- | --- |
| `/` | Pulse Arena — guided dual-tenant demo |
| `/architecture` | Live architecture — flow, metrics poll, reliability notes |

## Demo recordings

High-quality screen captures are attached to GitHub release **`v0.3.0`** (mp4 + posters). Links live in the root [README Demo video](../README.md#demo-video) section.

## Live demo (already hosted)

| Piece | URL |
| --- | --- |
| Pulse Arena UI | [https://engagepulse-topaz.vercel.app](https://engagepulse-topaz.vercel.app) |
| Go API | `https://api-production-2ef9b.up.railway.app` |

Open the Arena and click **Ignite live demo**. The BFF signs events server-side and talks to the Railway API (Postgres + Apache Kafka). Local Compose still uses Redpanda — same Kafka protocol.

If the API is unreachable, the Arena and Architecture pages show an offline banner with a link to the recorded `v0.3.0` Arena mp4.

### Vercel env

Production UI expects:

| Variable | Value |
| --- | --- |
| `ENGAGEPULSE_URL` | `https://api-production-2ef9b.up.railway.app` |
| `ACME_API_KEY` / `ACME_HMAC_SECRET` | demo keys from `.env.local.example` |
| `NOVA_API_KEY` / `NOVA_HMAC_SECRET` | demo keys from `.env.local.example` |

Stale laptop tunnel URLs (`trycloudflare`, `ngrok`, etc.) in `ENGAGEPULSE_URL` are ignored; the BFF falls back to the hosted Railway API. On Vercel with no URL set, it also uses that hosted API.

### Other ways to share

1. **Watch recordings** — `v0.3.0` release mp4s (no deploy).
2. **Local + tunnel** — run Postgres, Redpanda, `make run`, and `npm run dev`, then tunnel `:3000` (e.g. Cloudflare Tunnel) for a temporary share.
3. **Re-host the API** — deploy the Go binary with `HTTP_ADDR=0.0.0.0:8080`, a Postgres `DATABASE_URL`, and Kafka brokers; point Vercel `ENGAGEPULSE_URL` at that base URL.
